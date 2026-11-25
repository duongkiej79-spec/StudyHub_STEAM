import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

// Gioi han do dai moi tin nhan (user va ngu canh assistant).
const MAX_MESSAGE_CHARS = 1200;
const MAX_HISTORY_MESSAGES = 8;
// Dung luong JSON theo byte, du lon cho 8 tin nhan tieng Viet 1.200 ky tu.
const MAX_REQUEST_BYTES = 40000;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  promptFeedback?: { blockReason?: string };
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.trim().length > 0 &&
    message.content.length <= MAX_MESSAGE_CHARS
  );
}

function errorResponse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers:
        retryAfter !== undefined
          ? { "Retry-After": String(retryAfter) }
          : undefined,
    }
  );
}

function getRetryAfterSeconds(header: string | null): number | undefined {
  if (!header) return undefined;
  const asNumber = Number(header);
  if (Number.isFinite(asNumber) && asNumber >= 0) {
    return Math.min(Math.ceil(asNumber), 86400);
  }
  const time = Date.parse(header);
  if (!Number.isNaN(time)) {
    return Math.min(Math.max(0, Math.ceil((time - Date.now()) / 1000)), 86400);
  }
  return undefined;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: ChatMessage[]
): Promise<Response> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent`;

  const body = JSON.stringify({
    systemInstruction: {
      parts: [
        {
          text: `Bạn là StudyHub AI, gia sư hỗ trợ học sinh lớp 10, 11 và 12.
Trả lời bằng tiếng Việt, rõ ràng, chính xác và phù hợp lứa tuổi.
Hướng dẫn giải bài tập từng bước, khuyến khích học sinh tự suy luận.
Hỗ trợ các môn học THPT, đặc biệt Toán, Vật lý, Hóa học và Tiếng Anh.
Khi chưa chắc chắn, hãy nói rõ. Không bịa nguồn tài liệu.`,
        },
      ],
    },
    contents: messages.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.5,
    },
  });

  // Tối đa 2 lần gọi cho một câu hỏi. Không lặp vô hạn khi hết quota.
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      });

      const retryAfter = getRetryAfterSeconds(
        response.headers.get("Retry-After")
      );
      const shouldRetry =
        attempt === 0 &&
        (response.status === 503 ||
          (response.status === 429 &&
            retryAfter !== undefined &&
            retryAfter <= 2));

      if (shouldRetry) {
        await response.body?.cancel();
        const delay =
          response.status === 429
            ? (retryAfter ?? 0) * 1000 + Math.floor(Math.random() * 200)
            : 500 + Math.floor(Math.random() * 500);
        await sleep(delay);
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === 1) throw error;
      await sleep(500 + Math.floor(Math.random() * 500));
    }
  }

  throw new Error("Gemini retry exhausted");
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "StudyHub AI",
    provider: "Gemini",
  });
}

export async function POST(request: Request) {
  if (process.env.AI_CHAT_ENABLED === "false") {
    return errorResponse("StudyHub AI đang tạm bảo trì.", 503, 60);
  }

  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse("Vui lòng đăng nhập StudyHub để sử dụng AI.", 401);
    }

    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    if (!apiKey) {
      return errorResponse("StudyHub AI chưa cấu hình GEMINI_API_KEY.", 503);
    }

    const contentLength = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
      return errorResponse("Dữ liệu gửi quá dài.", 413);
    }

    // Tranh phu thuoc Content-Length (co the khong co trong mot so request).
    const raw = await request.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_REQUEST_BYTES) {
      return errorResponse("Dữ liệu gửi quá dài.", 413);
    }
    const body: unknown = (() => {
      try { return JSON.parse(raw) as unknown; }
      catch { return null; }
    })();
    const incoming =
      body && typeof body === "object" && "messages" in body
        ? (body as { messages: unknown }).messages
        : null;

    // 8 tin nhắn chỉ là ngữ cảnh của một lần gọi Gemini,
    // KHÔNG phải giới hạn tổng số câu hỏi hoặc số câu mỗi ngày.
    if (
      !Array.isArray(incoming) ||
      incoming.length < 1 ||
      incoming.length > MAX_HISTORY_MESSAGES ||
      !incoming.every(isChatMessage)
    ) {
      return errorResponse("Nội dung hội thoại không hợp lệ (tối đa 1.200 ký tự mỗi tin nhắn).", 400);
    }

    const messages: ChatMessage[] = incoming;
    if (messages[messages.length - 1].role !== "user") {
      return errorResponse("Tin nhắn cuối phải là câu hỏi của bạn.", 400);
    }

    const response = await callGemini(apiKey, model, messages);
    if (!response.ok) {
      console.warn("StudyHub Gemini status:", response.status);

      if (response.status === 429) {
        return errorResponse(
          "Gemini đã đạt hạn mức Google. Vui lòng thử lại sau.",
          429,
          getRetryAfterSeconds(response.headers.get("Retry-After"))
        );
      }
      if (response.status === 503) {
        return errorResponse(
          "Gemini đang quá tải tạm thời. Vui lòng thử lại sau.",
          503,
          30
        );
      }
      if (response.status === 404) {
        return errorResponse(
          "Model Gemini không khả dụng. Hãy kiểm tra GEMINI_MODEL.",
          502
        );
      }
      if (response.status === 400 || response.status === 403) {
        return errorResponse(
          "Gemini từ chối yêu cầu. Hãy kiểm tra cấu hình API và model.",
          502
        );
      }
      return errorResponse("Gemini tạm thời không trả lời được.", 502);
    }

    const data = (await response.json()) as GeminiResponse;
    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("\n")
        .trim() ?? "";

    if (!reply) {
      return errorResponse(
        "Gemini chưa tạo được câu trả lời. Hãy thử hỏi cách khác.",
        502
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const name = error instanceof Error ? error.name : "Unknown";
    console.error("StudyHub AI request failed:", name);
    const timeout = name === "TimeoutError" || name === "AbortError";
    return errorResponse(
      timeout
        ? "Gemini phản hồi quá lâu. Vui lòng thử lại."
        : "StudyHub AI gặp lỗi máy chủ. Vui lòng thử lại sau.",
      timeout ? 504 : 500
    );
  }
}

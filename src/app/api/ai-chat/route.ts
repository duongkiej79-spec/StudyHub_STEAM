
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;

  const m = value as Record<string, unknown>;

  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.trim().length > 0 &&
    m.content.length <= 1200
  );
}

// Kiểm tra API hoạt động
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "StudyHub AI",
    provider: "Gemini",
  });
}

// Xử lý câu hỏi chatbot
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Vui lòng đăng nhập StudyHub để sử dụng AI." },
        { status: 401 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình GEMINI_API_KEY." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => null);
    const messages: unknown = body?.messages;

    if (
      !Array.isArray(messages) ||
      messages.length === 0 ||
      messages.length > 8 ||
      !messages.every(isChatMessage)
    ) {
      return NextResponse.json(
        { error: "Nội dung hội thoại không hợp lệ." },
        { status: 400 }
      );
    }

    const chat: ChatMessage[] = messages;

    if (chat[chat.length - 1].role !== "user") {
      return NextResponse.json(
        { error: "Tin nhắn cuối phải là câu hỏi." },
        { status: 400 }
      );
    }

    // Model Gemini mới
    const model =
      process.env.GEMINI_MODEL || "gemini-3.8-flash";

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [
            {
              text: `
Bạn là StudyHub AI, gia sư hỗ trợ học sinh lớp 10, 11 và 12.

Nguyên tắc:
- Trả lời bằng tiếng Việt.
- Giải thích kiến thức dễ hiểu, chính xác.
- Hướng dẫn giải bài tập từng bước.
- Hỗ trợ Toán, Vật lý, Hóa học, Ngữ văn,
  Tiếng Anh và các môn THPT.
- Khuyến khích học sinh tự suy luận.
- Khi không chắc chắn, hãy nói rõ.
- Không bịa nguồn tài liệu.
- Giữ nội dung phù hợp với học sinh.
              `,
            },
          ],
        },
        contents: chat.map((message) => ({
          role:
            message.role === "assistant"
              ? "model"
              : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          maxOutputTokens: 2048,
          temperature: 0.5,
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const details = await response.text();

      console.error(
        "Gemini API:",
        response.status,
        details.slice(0, 1000)
      );

      let errorMessage = `Gemini gặp lỗi HTTP ${response.status}.`;

      if (response.status === 429) {
        errorMessage =
          "Đã đạt giới hạn sử dụng Gemini. Vui lòng thử lại sau.";
      } else if (response.status === 404) {
        errorMessage =
          "Model Gemini không khả dụng. Kiểm tra tên model.";
      } else if (
        response.status === 400 ||
        response.status === 403
      ) {
        errorMessage =
          "Gemini từ chối yêu cầu. Kiểm tra Terminal.";
      }

      return NextResponse.json(
        { error: errorMessage },
        {
          status: response.status >= 500
            ? 502
            : response.status,
        }
      );
    }

    const data = await response.json();

    const reply: string =
      data.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text ?? "")
        .join("\n")
        .trim() ?? "";

    if (!reply) {
      return NextResponse.json(
        { error: "Gemini chưa tạo được câu trả lời." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  
  
  }  catch (error) {
  const errorName =
    error instanceof Error ? error.name : "Unknown";

  const errorMessage =
    error instanceof Error
      ? error.message
      : "Unknown error";

  console.error("StudyHub AI error:", {
    name: errorName,
    message: errorMessage,
  });

  const isTimeout =
    errorName === "TimeoutError" ||
    errorName === "AbortError";

  return NextResponse.json(
    {
      error: isTimeout
        ? "Gemini phản hồi quá lâu. Vui lòng thử lại."
        : "StudyHub AI gặp lỗi máy chủ. Kiểm tra Terminal.",
    },
    { status: isTimeout ? 504 : 500 }
  );
}
}

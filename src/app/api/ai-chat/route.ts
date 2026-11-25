import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

type ChatMessage = { role: "user" | "assistant"; content: string };
type RedisArg = string | number;
type Permit = { allowed: boolean; probe: boolean; retryAfter: number };

function validMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as Record<string, unknown>;
  return (
    (m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string" &&
    m.content.trim().length > 0 &&
    m.content.length <= 1200
  );
}

function key(name: string): string {
  const namespace = process.env.AI_GUARD_NAMESPACE;
  if (!namespace || !/^[a-zA-Z0-9_-]+$/.test(namespace)) {
    throw new Error("AI_GUARD_NAMESPACE is missing or invalid");
  }
  return `studyhub-ai:${namespace}:${name}`;
}

async function redis<T>(...command: RedisArg[]): Promise<T> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Redis is not configured");

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });
  if (!response.ok) throw new Error(`Redis HTTP ${response.status}`);
  const payload = (await response.json()) as { result: T; error?: string };
  if (payload.error) throw new Error("Redis command failed");
  return payload.result;
}

// Lua executes atomically in Redis, across all Vercel instances.
const RATE_SCRIPT = `
local limits = {tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])}
for i = 1, 3 do
  if tonumber(redis.call('GET', KEYS[i]) or '0') >= limits[i] then
    return i
  end
end
for i = 1, 3 do
  local n = redis.call('INCR', KEYS[i])
  if n == 1 then redis.call('EXPIRE', KEYS[i], tonumber(ARGV[i + 3])) end
end
return 0
`;

async function checkLimits(userId: string) {
  const now = Date.now();
  const minute = Math.floor(now / 60000);
  const day = Math.floor(now / 86400000);
  const minuteTtl = Math.ceil((60000 - (now % 60000)) / 1000) + 3;
  const dayTtl = Math.ceil((86400000 - (now % 86400000)) / 1000) + 3;
  const idHash = createHash("sha256").update(userId).digest("hex").slice(0, 24);

  const limitedBy = Number(
    await redis<number>(
      "EVAL", RATE_SCRIPT, 3,
      key(`user:${idHash}:minute:${minute}`),
      key(`user:${idHash}:day:${day}`),
      key(`global:minute:${minute}`),
      4, 40, 20, minuteTtl, dayTtl, minuteTtl
    )
  );
  return {
    allowed: limitedBy === 0,
    retryAfter: limitedBy === 2 ? dayTtl : minuteTtl,
    reason: limitedBy === 2 ? "day" : limitedBy === 3 ? "system" : "minute",
  };
}

const ENTER_SCRIPT = `
local ttl = redis.call('TTL', KEYS[1])
if ttl > 0 then return {0, ttl} end
if redis.call('EXISTS', KEYS[2]) == 1 then
  local acquired = redis.call('SET', KEYS[3], '1', 'EX', 30, 'NX')
  if acquired then return {1, 0} end
  return {0, 5}
end
return {2, 0}
`;

async function enterCircuit(): Promise<Permit> {
  const state = await redis<number[]>(
    "EVAL", ENTER_SCRIPT, 3,
    key("breaker:open"), key("breaker:recover"), key("breaker:probe")
  );
  return {
    allowed: state[0] !== 0,
    probe: state[0] === 1,
    retryAfter: state[1] > 0 ? state[1] : 5,
  };
}

const FAILURE_SCRIPT = `
if ARGV[1] == '429' then
  redis.call('SET', KEYS[2], '429', 'EX', 180)
  redis.call('SET', KEYS[3], '1', 'EX', 3600)
  redis.call('DEL', KEYS[4])
  return 1
end
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], 60) end
if n >= 3 or ARGV[2] == '1' then
  redis.call('SET', KEYS[2], '503', 'EX', 60)
  redis.call('SET', KEYS[3], '1', 'EX', 3600)
  redis.call('DEL', KEYS[4])
  return 1
end
return 0
`;

async function recordFailure(status: 429 | 503, probe: boolean) {
  await redis<number>(
    "EVAL", FAILURE_SCRIPT, 4,
    key("breaker:failures"), key("breaker:open"),
    key("breaker:recover"), key("breaker:probe"),
    status, probe ? 1 : 0
  );
}

async function recordSuccess(probe: boolean) {
  if (probe) {
    await redis<number>(
      "DEL", key("breaker:open"), key("breaker:recover"),
      key("breaker:probe"), key("breaker:failures")
    );
  } else {
    await redis<number>("DEL", key("breaker:failures"));
  }
}

function errorResponse(message: string, status: number, retryAfter?: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: retryAfter ? { "Retry-After": String(retryAfter) } : undefined,
    }
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGemini(chat: ChatMessage[], apiKey: string, model: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: {
      parts: [{ text: `Bạn là StudyHub AI, gia sư hỗ trợ học sinh lớp 10, 11 và 12.
Trả lời bằng tiếng Việt. Giải thích dễ hiểu và chính xác.
Hướng dẫn giải bài tập từng bước; hỗ trợ các môn học THPT.
Khuyến khích học sinh tự suy luận; khi không chắc chắn hãy nói rõ.
Không bịa nguồn tài liệu; giữ nội dung phù hợp với học sinh.` }],
    },
    contents: chat.map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content }],
    })),
    generationConfig: { maxOutputTokens: 2048, temperature: 0.5 },
  });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      // Only works on Preview. Never simulate errors on Production.
      const test = process.env.VERCEL_ENV === "preview"
        ? process.env.AI_TEST_GEMINI_STATUS : undefined;
      const response = test === "200"
        ? new Response(
            JSON.stringify({ candidates: [{ content: { parts: [{ text: "StudyHub AI: phản hồi thử nghiệm." }] } }] }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        : test === "429" || test === "503"
          ? new Response(null, { status: Number(test) })
          : await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body,
            cache: "no-store",
            signal: AbortSignal.timeout(8000),
          });

      if (attempt === 0 && response.status === 503) {
        await response.body?.cancel();
        await sleep(500 + Math.floor(Math.random() * 500));
        continue;
      }
      if (attempt === 0 && response.status === 429) {
        const header = response.headers.get("Retry-After");
        const seconds = header === null ? NaN : Number(header);
        if (Number.isFinite(seconds) && seconds >= 0 && seconds <= 2) {
          await response.body?.cancel();
          await sleep(seconds * 1000 + Math.floor(Math.random() * 200));
          continue;
        }
      }
      return response;
    } catch (error) {
      if (attempt === 1) throw error;
      await sleep(500 + Math.floor(Math.random() * 500));
    }
  }
  throw new Error("Gemini attempts exhausted");
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "StudyHub AI", provider: "Gemini" });
}

export async function POST(request: Request) {
  if (process.env.AI_CHAT_ENABLED === "false") {
    return errorResponse("StudyHub AI đang tạm bảo trì.", 503, 60);
  }

  // getCurrentUser() đã xác thực phiên ở phía server của StudyHub.
  // Lấy ID từ phiên này; không dùng userId được gửi lên từ trình duyệt.
  let userId: string;
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return errorResponse("Vui lòng đăng nhập StudyHub để sử dụng AI.", 401);
    }

    const identity = currentUser as { id?: unknown; userId?: unknown };
    const id = typeof identity.id === "string"
      ? identity.id
      : typeof identity.userId === "string"
        ? identity.userId
        : null;
    if (!id) {
      console.error("StudyHub AI: authenticated session has no user ID");
      return errorResponse("Chưa xác định được tài khoản StudyHub.", 503);
    }
    userId = id;
  } catch {
    return errorResponse("Không kiểm tra được phiên đăng nhập.", 503);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  if (!apiKey) {
    return errorResponse("StudyHub AI chưa được cấu hình đầy đủ.", 503);
  }

  if (Number(request.headers.get("content-length")) > 20000) {
    return errorResponse("Nội dung gửi quá dài.", 413);
  }
  const body = await request.json().catch(() => null);
  const messages: unknown = body?.messages;
  if (
    !Array.isArray(messages) || messages.length < 1 ||
    messages.length > 8 || !messages.every(validMessage) ||
    messages[messages.length - 1].role !== "user"
  ) {
    return errorResponse("Nội dung hội thoại không hợp lệ.", 400);
  }

  let probe = false;
  try {
    const limit = await checkLimits(userId);
    if (!limit.allowed) {
      const message = limit.reason === "day"
        ? "Bạn đã đạt giới hạn câu hỏi hôm nay."
        : limit.reason === "system"
          ? "StudyHub AI đang nhận nhiều câu hỏi. Hãy thử lại sau."
          : "Bạn đang gửi câu hỏi quá nhanh. Hãy thử lại sau.";
      return errorResponse(message, 429, limit.retryAfter);
    }

    const permit = await enterCircuit();
    if (!permit.allowed) {
      return errorResponse("Gemini đang quá tải. StudyHub AI sẽ tự thử phục hồi.", 503, permit.retryAfter);
    }
    probe = permit.probe;
  } catch (error) {
    console.error("AI protection store error", error instanceof Error ? error.name : "unknown");
    return errorResponse("Bộ bảo vệ StudyHub AI tạm thời không khả dụng.", 503, 30);
  }

  let response: Response;
  try {
    response = await callGemini(messages, apiKey, model);
  } catch (error) {
    console.warn("Gemini network/timeout", error instanceof Error ? error.name : "unknown");
    try { await recordFailure(503, probe); } catch { console.error("Cannot record Gemini failure"); }
    return errorResponse("Gemini phản hồi quá lâu. Vui lòng thử lại sau.", 503, 60);
  }

  if (!response.ok) {
    console.warn("Gemini HTTP status", response.status);
    if (response.status === 429 || response.status === 503) {
      try { await recordFailure(response.status, probe); }
      catch { console.error("Cannot record Gemini overload"); }
      return errorResponse(
        response.status === 429
          ? "Gemini đang đạt giới hạn sử dụng. Hãy thử lại sau."
          : "Gemini đang quá tải tạm thời. Hãy thử lại sau.",
        503, response.status === 429 ? 180 : 60
      );
    }
    if (probe) {
      try { await recordFailure(503, true); } catch { /* recorded in server logs */ }
    }
    return errorResponse("Gemini không xử lý được yêu cầu. Kiểm tra cấu hình model/API.", 502);
  }

  try {
    const data = await response.json();
    const reply: string = data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim() ?? "";
    if (!reply) {
      if (probe) {
        try { await recordFailure(503, true); } catch { /* logged elsewhere */ }
      }
      return errorResponse("Gemini chưa tạo được câu trả lời.", 502);
    }
    try { await recordSuccess(probe); }
    catch { console.error("Cannot reset AI circuit state"); }
    return NextResponse.json({ reply });
  } catch {
    if (probe) {
      try { await recordFailure(503, true); } catch { /* logged elsewhere */ }
    }
    return errorResponse("Phản hồi Gemini không hợp lệ.", 502);
  }
}

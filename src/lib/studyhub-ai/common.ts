import { getCurrentUser } from "@/lib/auth";

/** Keep authentication on the server; never trust an ID from a browser. */
export async function getStudyHubIdentity(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const identity = user as { id?: unknown; userId?: unknown; email?: unknown };
  const value = [identity.id, identity.userId, identity.email].find(
    (part) => typeof part === "string" && part.length > 0
  );
  return typeof value === "string" ? value : null;
}

export function apiError(message: string, status = 400): Response {
  return Response.json({ error: message }, { status });
}

export function errorMessage(error: unknown): string {
  if (error instanceof GeminiServiceError) {
    if (error.status === 429) return "Gemini đã đạt hạn mức. Vui lòng thử lại sau.";
    if (error.status === 503 || error.status === 504)
      return "Gemini tạm thời quá tải. Vui lòng thử lại sau.";
    if (error.status === 404) return "Model Gemini không khả dụng. Hãy kiểm tra AI_V2_MODEL.";
    return "Không tạo được nội dung từ Gemini. Hãy thử lại sau.";
  }
  return "Hệ thống AI tạm thời không hoạt động. Vui lòng thử lại sau.";
}

export class GeminiServiceError extends Error {
  constructor(public status: number) {
    super(`Gemini HTTP ${status}`);
  }
}

/** Dedicated model for this feature; no impact on existing chatbot. */
export async function generateGeminiText(
  systemInstruction: string,
  prompt: string,
  jsonMode = false
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiServiceError(503);
  const model = process.env.AI_V2_MODEL || process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: systemInstruction }] },
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: jsonMode ? 0.25 : 0.5,
      maxOutputTokens: jsonMode ? 8192 : 2048,
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  });
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        cache: "no-store",
        body,
        signal: AbortSignal.timeout(20000),
      });
      if (response.status === 503 && attempt === 0) {
        await response.body?.cancel();
        await new Promise((resolve) => setTimeout(resolve, 600));
        continue;
      }
      if (!response.ok) throw new GeminiServiceError(response.status);
      const data = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const result = data.candidates?.[0]?.content?.parts
        ?.map((item) => item.text ?? "")
        .join("\n").trim();
      if (!result) throw new GeminiServiceError(502);
      return result;
    } catch (error) {
      if (error instanceof GeminiServiceError) throw error;
      if (attempt === 1) throw new GeminiServiceError(504);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }
  }
  throw new GeminiServiceError(503);
}

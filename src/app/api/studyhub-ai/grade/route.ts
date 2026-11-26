import { apiError, getStudyHubIdentity } from "@/lib/studyhub-ai/common";
import { readQuizKey } from "@/lib/studyhub-ai/quiz-token";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const owner = await getStudyHubIdentity();
  if (!owner) return apiError("Vui lòng đăng nhập để nộp bài.", 401);
  const raw: unknown = await request.json().catch(() => null);
  const data = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
  if (typeof data.token !== "string" || !Array.isArray(data.answers)) {
    return apiError("Dữ liệu nộp bài không hợp lệ.", 400);
  }
  try {
    const key = readQuizKey(data.token);
    if (key.owner !== owner || key.expiresAt < Date.now()) {
      return apiError("Bài kiểm tra đã hết hạn hoặc không thuộc tài khoản này.", 403);
    }
    if (
      data.answers.length !== key.questions.length ||
      data.answers.some((answer) => answer !== null && (!Number.isInteger(answer) || answer < 0 || answer > 3))
    ) return apiError("Đáp án nộp bài không hợp lệ.", 400);
    let correct = 0;
    const details = key.questions.map((question, index) => {
      const given = data.answers[index];
      const isCorrect = given === question.correctIndex;
      if (isCorrect) correct++;
      return { id: question.id, selected: given, correctIndex: question.correctIndex, isCorrect, explanation: question.explanation };
    });
    return Response.json({ correct, total: key.questions.length, score: Math.round(correct / key.questions.length * 100) / 10, details });
  } catch {
    return apiError("Mã bài kiểm tra không hợp lệ hoặc đã bị thay đổi.", 400);
  }
}

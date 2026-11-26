
import {
  apiError,
  getStudyHubIdentity,
} from "@/lib/studyhub-ai/common";
import { readQuizKey } from "@/lib/studyhub-ai/quiz-token";

export const runtime = "nodejs";

function validAnswer(value: unknown): value is number | null {
  return (
    value === null ||
    (typeof value === "number" &&
      Number.isInteger(value) &&
      value >= 0 &&
      value <= 3)
  );
}

export async function POST(request: Request) {
  const owner = await getStudyHubIdentity();

  if (!owner) {
    return apiError("Vui lòng đăng nhập để nộp bài.", 401);
  }

  const raw: unknown = await request.json().catch(() => null);
  const data =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};

  const token = data.token;
  const rawAnswers = data.answers;

  if (
    typeof token !== "string" ||
    !Array.isArray(rawAnswers) ||
    !rawAnswers.every(validAnswer)
  ) {
    return apiError("Dữ liệu nộp bài không hợp lệ.", 400);
  }

  const answers: (number | null)[] = rawAnswers;

  try {
    const key = readQuizKey(token);

    if (key.owner !== owner || key.expiresAt < Date.now()) {
      return apiError(
        "Bài kiểm tra đã hết hạn hoặc không thuộc tài khoản này.",
        403
      );
    }

    if (answers.length !== key.questions.length) {
      return apiError("Đáp án nộp bài không hợp lệ.", 400);
    }

    let correct = 0;

    const details = key.questions.map((question, index) => {
      const given = answers[index];
      const isCorrect = given === question.correctIndex;

      if (isCorrect) correct++;

      return {
        id: question.id,
        selected: given,
        correctIndex: question.correctIndex,
        isCorrect,
        explanation: question.explanation,
      };
    });

    return Response.json({
      correct,
      total: key.questions.length,
      score:
        Math.round((correct / key.questions.length) * 100) / 10,
      details,
    });
  } catch {
    return apiError("Mã bài kiểm tra không hợp lệ hoặc đã bị thay đổi.", 400);
  }
}

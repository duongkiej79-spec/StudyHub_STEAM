import type { Question, QuizResult } from "./types";

/** Điểm thang 10, làm tròn 2 chữ số (khớp với grade_quiz() trong SQL). */
export function scoreOutOf10(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct * 1000) / total) / 100;
}

/**
 * Chấm điểm: đúng 1 điểm, sai/bỏ trống 0 điểm, quy về thang 10.
 * Chỉ chấp nhận phương án thuộc đúng câu hỏi đó.
 */
export function gradeQuestions(quizId: string, questions: Question[], answers: Record<string, string>): QuizResult {
  const sorted = [...questions].sort((a, b) => a.order - b.order);
  const graded = sorted.map((q) => {
    const correct = q.options.find((o) => o.isCorrect);
    const pickedId = answers[q.id];
    const picked = q.options.find((o) => o.id === pickedId) ?? null;
    return {
      questionId: q.id,
      text: q.text,
      selectedOptionId: picked?.id ?? null,
      correctOptionId: correct?.id ?? "",
      isCorrect: !!picked && !!correct && picked.id === correct.id,
      explanation: q.explanation,
      options: q.options.map((o) => ({ id: o.id, text: o.text })),
    };
  });
  const correctCount = graded.filter((g) => g.isCorrect).length;
  return {
    quizId,
    correctCount,
    total: graded.length,
    score: scoreOutOf10(correctCount, graded.length),
    questions: graded,
  };
}

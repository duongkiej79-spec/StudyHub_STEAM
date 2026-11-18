import type { AttemptSummary } from "./types";

export interface SubjectProgress {
  subjectId: string;
  attempts: number;
  quizzesDone: number;
  averageScore: number;
  /** Trung bình điểm cao nhất của từng đề (phản ánh mức đã đạt được). */
  bestAverage: number;
  lastAt: string;
}

export interface ProgressSummary {
  totalAttempts: number;
  quizzesDone: number;
  averageScore: number;
  attemptsLast7Days: number;
  bySubject: SubjectProgress[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const avg = (xs: number[]) => (xs.length ? round2(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/** Tổng hợp tiến độ học tập từ lịch sử làm bài (thuần — dùng chung mọi backend). */
export function summarizeProgress(attempts: AttemptSummary[], now: Date = new Date()): ProgressSummary {
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const bySubject = new Map<string, AttemptSummary[]>();
  for (const a of attempts) bySubject.set(a.subjectId, [...(bySubject.get(a.subjectId) ?? []), a]);

  const subjects: SubjectProgress[] = [...bySubject.entries()].map(([subjectId, list]) => {
    const best = new Map<string, number>();
    for (const a of list) best.set(a.quizId, Math.max(best.get(a.quizId) ?? 0, a.score));
    return {
      subjectId,
      attempts: list.length,
      quizzesDone: best.size,
      averageScore: avg(list.map((a) => a.score)),
      bestAverage: avg([...best.values()]),
      lastAt: list.map((a) => a.submittedAt).sort().at(-1) ?? "",
    };
  });

  return {
    totalAttempts: attempts.length,
    quizzesDone: new Set(attempts.map((a) => a.quizId)).size,
    averageScore: avg(attempts.map((a) => a.score)),
    attemptsLast7Days: attempts.filter((a) => new Date(a.submittedAt).getTime() >= weekAgo).length,
    bySubject: subjects.sort((a, b) => b.lastAt.localeCompare(a.lastAt)),
  };
}

// Kiểm thử các phần lõi thuần (không cần máy chủ): chạy bằng `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { gradeQuestions, scoreOutOf10 } from "../src/lib/grading.ts";
import { searchDocuments } from "../src/lib/search.ts";
import { buildSeedDocuments, buildSeedQuizzes, seedCatalog, seedId } from "../src/lib/seed-data.ts";
import { normalizeVi, slugify } from "../src/lib/text.ts";

test("normalizeVi bỏ dấu tiếng Việt và chữ đ", () => {
  assert.equal(normalizeVi("Công thức Nguyên hàm – Toán 12"), "cong thuc nguyen ham toan 12");
  assert.equal(normalizeVi("Đồng vị"), "dong vi");
  assert.equal(slugify("Lớp 10 / Hóa học"), "lop-10-hoa-hoc");
});

test("seedId sinh UUID ổn định, đúng định dạng", () => {
  const a = seedId("x");
  assert.equal(a, seedId("x"));
  assert.match(a, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("dữ liệu mẫu: mỗi câu có đúng 4 phương án và đúng 1 đáp án đúng", () => {
  const { questions } = buildSeedQuizzes();
  for (const q of questions) {
    assert.equal(q.options.length, 4, q.text);
    assert.equal(q.options.filter((o) => o.isCorrect).length, 1, q.text);
  }
});

test("chấm điểm: đúng 1, sai/bỏ trống 0, quy về thang 10", () => {
  const { quizzes, questions } = buildSeedQuizzes();
  const quiz = quizzes[0];
  const qs = questions.filter((q) => q.quizId === quiz.id);
  const all = Object.fromEntries(qs.map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id]));
  assert.equal(gradeQuestions(quiz.id, qs, all).score, 10);
  assert.equal(gradeQuestions(quiz.id, qs, {}).score, 0);

  const half = Object.fromEntries(qs.slice(0, 3).map((q) => [q.id, q.options.find((o) => o.isCorrect)!.id]));
  const r = gradeQuestions(quiz.id, qs, half);
  assert.equal(r.correctCount, 3);
  assert.equal(r.score, scoreOutOf10(3, qs.length));
});

test("chấm điểm: không chấp nhận phương án của câu khác", () => {
  const { quizzes, questions } = buildSeedQuizzes();
  const qs = questions.filter((q) => q.quizId === quizzes[0].id);
  const foreign = { [qs[0].id]: qs[1].options.find((o) => o.isCorrect)!.id };
  const r = gradeQuestions(quizzes[0].id, qs, foreign);
  assert.equal(r.questions[0].selectedOptionId, null);
  assert.equal(r.correctCount, 0);
});

test("scoreOutOf10 làm tròn 2 chữ số", () => {
  assert.equal(scoreOutOf10(1, 3), 3.33);
  assert.equal(scoreOutOf10(2, 3), 6.67);
  assert.equal(scoreOutOf10(0, 0), 0);
});

const published = buildSeedDocuments().filter((d) => d.status === "published");

test("tìm kiếm không dấu khớp tài liệu có dấu", () => {
  const hits = searchDocuments(published, seedCatalog, { q: "nguyen ham" });
  assert.ok(hits.length > 0);
  assert.match(hits[0].doc.title, /Nguyên hàm/);
});

test("tìm kiếm theo tiền tố khi đang gõ dở", () => {
  const hits = searchDocuments(published, seedCatalog, { q: "dao do" });
  assert.ok(hits.some((h) => h.doc.title.includes("Dao động")));
});

test("tìm kiếm yêu cầu mọi từ khóa đều khớp", () => {
  assert.equal(searchDocuments(published, seedCatalog, { q: "nguyen ham xyzabc" }).length, 0);
});

test("bộ lọc lớp/môn/loại hoạt động", () => {
  const hits = searchDocuments(published, seedCatalog, { grade: 12, subject: "toan", type: "tom_tat" });
  assert.ok(hits.length > 0);
  for (const h of hits) {
    assert.equal(h.doc.gradeId, 12);
    assert.equal(h.doc.subjectId, "toan");
    assert.equal(h.doc.type, "tom_tat");
  }
});

// ---------- P1: tiến độ học tập ----------
import { summarizeProgress } from "../src/lib/progress.ts";

test("tổng hợp tiến độ theo môn, lấy điểm cao nhất mỗi đề", () => {
  const base = { quizTitle: "x", gradeId: 12 as const, correctCount: 0, total: 10 };
  const p = summarizeProgress(
    [
      { ...base, id: "1", quizId: "q1", subjectId: "toan", score: 4, submittedAt: "2026-11-10T00:00:00Z" },
      { ...base, id: "2", quizId: "q1", subjectId: "toan", score: 8, submittedAt: "2026-11-17T00:00:00Z" },
      { ...base, id: "3", quizId: "q2", subjectId: "toan", score: 6, submittedAt: "2026-11-16T00:00:00Z" },
      { ...base, id: "4", quizId: "q3", subjectId: "vat-ly", score: 10, submittedAt: "2026-11-01T00:00:00Z" },
    ],
    new Date("2026-11-18T00:00:00Z"),
  );
  assert.equal(p.totalAttempts, 4);
  assert.equal(p.quizzesDone, 3);
  assert.equal(p.averageScore, 7);
  assert.equal(p.attemptsLast7Days, 2);
  const toan = p.bySubject.find((s) => s.subjectId === "toan")!;
  assert.equal(toan.attempts, 3);
  assert.equal(toan.quizzesDone, 2);
  assert.equal(toan.bestAverage, 7); // (8 + 6) / 2
  assert.equal(p.bySubject[0].subjectId, "toan"); // môn làm gần nhất lên đầu
});

test("tiến độ rỗng khi chưa làm bài", () => {
  const p = summarizeProgress([]);
  assert.equal(p.totalAttempts, 0);
  assert.equal(p.averageScore, 0);
  assert.deepEqual(p.bySubject, []);
});

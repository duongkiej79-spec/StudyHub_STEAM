/**
 * Sinh supabase/seed.sql từ src/lib/seed-data.ts để hai backend có cùng dữ liệu mẫu.
 *   npm run db:seed-sql
 * Tệp PDF mẫu (storage/samples/*.pdf) cần được tải lên bucket "documents" với cùng đường dẫn
 * "samples/<tên>.pdf" — xem README, mục Supabase.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildSeedDocuments, buildSeedQuizzes, seedCatalog } from "../src/lib/seed-data.ts";

const ROOT = path.resolve(import.meta.dirname, "..");

function lit(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function insert(table: string, cols: string[], rows: unknown[][]): string {
  if (!rows.length) return "";
  const values = rows.map((r) => `  (${r.map(lit).join(", ")})`).join(",\n");
  return `insert into public.${table} (${cols.join(", ")}) values\n${values}\non conflict do nothing;\n`;
}

const manifest = JSON.parse(await readFile(path.join(ROOT, "storage", "samples", "manifest.json"), "utf8").catch(() => "{}"));
const docs = buildSeedDocuments(manifest);
const { quizzes, questions } = buildSeedQuizzes();
const c = seedCatalog;

const sql = [
  "-- Sinh tự động bởi scripts/gen-seed-sql.mts — đừng sửa tay.",
  "begin;",
  insert("grades", ["id", "name", "slug"], c.grades.map((g) => [g.id, g.name, g.slug])),
  insert("subjects", ["id", "name", "sort_order"], c.subjects.map((s) => [s.id, s.name, s.order])),
  insert("textbook_series", ["id", "name"], c.series.map((s) => [s.id, s.name])),
  insert(
    "chapters",
    ["id", "grade_id", "subject_id", "textbook_series_id", "title", "sort_order"],
    c.chapters.map((x) => [x.id, x.gradeId, x.subjectId, x.seriesId, x.title, x.order]),
  ),
  insert("lessons", ["id", "chapter_id", "title", "sort_order"], c.lessons.map((l) => [l.id, l.chapterId, l.title, l.order])),
  insert(
    "documents",
    ["id", "title", "grade_id", "subject_id", "textbook_series_id", "chapter_id", "lesson_id", "type", "description", "file_path", "file_size", "page_count", "source", "license_note", "status", "created_at", "updated_at", "published_at"],
    docs.map((d) => [d.id, d.title, d.gradeId, d.subjectId, d.seriesId, d.chapterId, d.lessonId, d.type, d.description, d.filePath, d.fileSize, d.pageCount, d.source, d.licenseNote, d.status, d.createdAt, d.updatedAt, d.publishedAt]),
  ),
  insert(
    "quizzes",
    ["id", "title", "description", "grade_id", "subject_id", "chapter_id", "duration_minutes", "is_published", "created_at", "updated_at"],
    quizzes.map((q) => [q.id, q.title, q.description, q.gradeId, q.subjectId, q.chapterId, q.durationMinutes, q.isPublished, q.createdAt, q.updatedAt]),
  ),
  insert("questions", ["id", "quiz_id", "text", "explanation", "sort_order"], questions.map((q) => [q.id, q.quizId, q.text, q.explanation, q.order])),
  insert(
    "question_options",
    ["id", "question_id", "option_text", "is_correct", "sort_order"],
    questions.flatMap((q) => q.options.map((o, i) => [o.id, q.id, o.text, o.isCorrect, i])),
  ),
  "commit;",
  "",
].join("\n");

await writeFile(path.join(ROOT, "supabase", "seed.sql"), sql, "utf8");
console.log(`Đã ghi supabase/seed.sql (${docs.length} tài liệu, ${quizzes.length} đề, ${questions.length} câu hỏi).`);

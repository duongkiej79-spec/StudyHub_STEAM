import "server-only";
import { createSupabaseServerClient } from "../supabase/server";
import type {
  Chapter,
  GradeId,
  Lesson,
  Question,
  Quiz,
  QuizResult,
  QuizSummary,
  Report,
  StudyDocument,
} from "../types";
import type { DocumentPatch, PublicQuiz, Repository } from "./types";

/**
 * Cài đặt Repository trên Supabase. Mọi truy vấn chạy bằng phiên của người dùng
 * (khách = anon), nên RLS trong supabase/migrations/0001_schema.sql là lớp bảo vệ cuối.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const db = createSupabaseServerClient;

type Res<T> = { data: T; error: { message: string } | null };

/** Có lỗi → ném; không có dữ liệu → ném. Dùng cho select/insert(...).select(). */
function check<T>(res: Res<T>): NonNullable<T> {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  if (res.data == null) throw new Error("Supabase: không có dữ liệu trả về");
  return res.data;
}

/** Có lỗi → ném; dữ liệu có thể null (maybeSingle, RPC trả null). */
function maybe<T>(res: Res<T>): T | null {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data ?? null;
}

/** Chỉ kiểm tra lỗi (update/delete/insert không select). */
function ok(res: { error: { message: string } | null }): void {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
}

const toChapter = (r: Row): Chapter => ({
  id: r.id,
  gradeId: r.grade_id as GradeId,
  subjectId: r.subject_id,
  seriesId: r.textbook_series_id,
  title: r.title,
  order: r.sort_order,
});

const toLesson = (r: Row): Lesson => ({ id: r.id, chapterId: r.chapter_id, title: r.title, order: r.sort_order });

const toDoc = (r: Row): StudyDocument => ({
  id: r.id,
  title: r.title,
  gradeId: r.grade_id,
  subjectId: r.subject_id,
  seriesId: r.textbook_series_id,
  chapterId: r.chapter_id,
  lessonId: r.lesson_id,
  type: r.type,
  description: r.description,
  filePath: r.file_path,
  fileSize: r.file_size,
  pageCount: r.page_count,
  source: r.source,
  licenseNote: r.license_note,
  status: r.status,
  reviewNote: r.review_note,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  publishedAt: r.published_at,
});

function fromDocPatch(p: DocumentPatch): Row {
  const map: Record<string, string> = {
    title: "title",
    gradeId: "grade_id",
    subjectId: "subject_id",
    seriesId: "textbook_series_id",
    chapterId: "chapter_id",
    lessonId: "lesson_id",
    type: "type",
    description: "description",
    source: "source",
    licenseNote: "license_note",
    filePath: "file_path",
    fileSize: "file_size",
    pageCount: "page_count",
    status: "status",
    reviewNote: "review_note",
    publishedAt: "published_at",
  };
  const row: Row = {};
  for (const [k, v] of Object.entries(p)) if (v !== undefined && map[k]) row[map[k]] = v;
  return row;
}

const toQuiz = (r: Row): Quiz => ({
  id: r.id,
  title: r.title,
  description: r.description,
  gradeId: r.grade_id,
  subjectId: r.subject_id,
  chapterId: r.chapter_id,
  durationMinutes: r.duration_minutes,
  isPublished: r.is_published,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function fromQuizInput(q: Partial<Quiz>): Row {
  const row: Row = {};
  if (q.title !== undefined) row.title = q.title;
  if (q.description !== undefined) row.description = q.description;
  if (q.gradeId !== undefined) row.grade_id = q.gradeId;
  if (q.subjectId !== undefined) row.subject_id = q.subjectId;
  if (q.chapterId !== undefined) row.chapter_id = q.chapterId;
  if (q.durationMinutes !== undefined) row.duration_minutes = q.durationMinutes;
  if (q.isPublished !== undefined) row.is_published = q.isPublished;
  return row;
}

const toQuestion = (r: Row): Question => ({
  id: r.id,
  quizId: r.quiz_id,
  text: r.text,
  explanation: r.explanation,
  order: r.sort_order,
  options: [...(r.question_options ?? [])]
    .sort((a: Row, b: Row) => a.sort_order - b.sort_order)
    .map((o: Row) => ({ id: o.id, text: o.option_text, isCorrect: o.is_correct })),
});

async function withCounts(rows: Row[]): Promise<QuizSummary[]> {
  const sb = await db();
  const counts = check(await sb.rpc("quiz_question_counts")) as Row[];
  const byId = new Map(counts.map((c) => [c.quiz_id, Number(c.question_count)]));
  return rows.map((r) => ({ ...toQuiz(r), questionCount: byId.get(r.id) ?? 0 }));
}

export const supabaseRepo: Repository = {
  async getCatalog() {
    const sb = await db();
    const [g, s, se, c, l] = await Promise.all([
      sb.from("grades").select("*").order("id"),
      sb.from("subjects").select("*").order("sort_order"),
      sb.from("textbook_series").select("*").order("name"),
      sb.from("chapters").select("*").order("sort_order"),
      sb.from("lessons").select("*").order("sort_order"),
    ]);
    return {
      grades: check(g).map((r: Row) => ({ id: r.id, name: r.name, slug: r.slug })),
      subjects: check(s).map((r: Row) => ({ id: r.id, name: r.name, order: r.sort_order })),
      series: check(se).map((r: Row) => ({ id: r.id, name: r.name })),
      chapters: check(c).map(toChapter),
      lessons: check(l).map(toLesson),
    };
  },

  async createChapter(input) {
    const sb = await db();
    const row = check(
      await sb
        .from("chapters")
        .insert({
          grade_id: input.gradeId,
          subject_id: input.subjectId,
          textbook_series_id: input.seriesId,
          title: input.title,
          sort_order: input.order,
        })
        .select()
        .single(),
    );
    return toChapter(row);
  },

  async createLesson(input) {
    const sb = await db();
    const row = check(
      await sb
        .from("lessons")
        .insert({ chapter_id: input.chapterId, title: input.title, sort_order: input.order })
        .select()
        .single(),
    );
    return toLesson(row);
  },

  async listPublishedDocuments() {
    const sb = await db();
    return check(await sb.from("documents").select("*").eq("status", "published")).map(toDoc);
  },

  async getPublishedDocument(id) {
    const sb = await db();
    const row = maybe(await sb.from("documents").select("*").eq("id", id).eq("status", "published").maybeSingle());
    return row ? toDoc(row) : null;
  },

  async listAllDocuments() {
    const sb = await db();
    return check(await sb.from("documents").select("*").order("updated_at", { ascending: false })).map(toDoc);
  },

  async getDocument(id) {
    const sb = await db();
    const row = maybe(await sb.from("documents").select("*").eq("id", id).maybeSingle());
    return row ? toDoc(row) : null;
  },

  async createDocument(input) {
    const sb = await db();
    const row = fromDocPatch(input);
    if (input.status === "published") row.published_at = new Date().toISOString();
    return toDoc(check(await sb.from("documents").insert(row).select().single()));
  },

  async updateDocument(id, patch) {
    const sb = await db();
    return toDoc(check(await sb.from("documents").update(fromDocPatch(patch)).eq("id", id).select().single()));
  },

  async deleteDocument(id) {
    const sb = await db();
    ok(await sb.from("documents").delete().eq("id", id));
  },

  async listPublishedQuizzes() {
    const sb = await db();
    return withCounts(check(await sb.from("quizzes").select("*").eq("is_published", true).order("grade_id")));
  },

  async getPublicQuiz(id) {
    const sb = await db();
    const data = maybe(await sb.rpc("get_public_quiz", { p_quiz_id: id }));
    return (data as PublicQuiz | null) ?? null;
  },

  async gradeQuiz(quizId, answers) {
    const sb = await db();
    const data = maybe(await sb.rpc("grade_quiz", { p_quiz_id: quizId, p_answers: answers }));
    if (!data) return null;
    const r = data as QuizResult;
    return { ...r, score: Number(r.score) };
  },

  // ---------------- Tài khoản học sinh (P1). RLS bảo đảm chỉ đọc/ghi dữ liệu của chính mình.
  async listFavorites(userId) {
    const sb = await db();
    const rows = check(
      await sb.from("favorites").select("created_at, documents(*)").eq("user_id", userId).order("created_at", { ascending: false }),
    ) as Row[];
    // documents(*) bị RLS lọc: tài liệu đã bị ẩn/gỡ trả về null.
    return rows.map((r) => r.documents).filter((d: Row | null) => d && d.status === "published").map(toDoc);
  },

  async isFavorite(userId, documentId) {
    const sb = await db();
    const row = maybe(await sb.from("favorites").select("document_id").eq("user_id", userId).eq("document_id", documentId).maybeSingle());
    return !!row;
  },

  async setFavorite(userId, documentId, on) {
    const sb = await db();
    if (on) ok(await sb.from("favorites").upsert({ user_id: userId, document_id: documentId }, { onConflict: "user_id,document_id", ignoreDuplicates: true }));
    else ok(await sb.from("favorites").delete().eq("user_id", userId).eq("document_id", documentId));
  },

  async listAttempts(userId) {
    const sb = await db();
    const rows = check(
      await sb.from("quiz_attempts").select("*, quizzes(title, grade_id, subject_id)").eq("user_id", userId).order("submitted_at", { ascending: false }).limit(200),
    ) as Row[];
    return rows
      .filter((r) => r.quizzes)
      .map((r) => ({
        id: r.id,
        quizId: r.quiz_id,
        quizTitle: r.quizzes.title,
        gradeId: r.quizzes.grade_id,
        subjectId: r.quizzes.subject_id,
        correctCount: r.correct_count,
        total: r.total,
        score: Number(r.score),
        submittedAt: r.submitted_at,
      }));
  },

  async getAttemptResult(_userId, attemptId) {
    // Hàm SQL tự kiểm tra a.user_id = auth.uid().
    const sb = await db();
    const data = maybe(await sb.rpc("get_attempt_result", { p_attempt_id: attemptId }));
    if (!data) return null;
    const r = data as QuizResult;
    return { ...r, score: Number(r.score) };
  },

  async listAllQuizzes() {
    const sb = await db();
    return withCounts(check(await sb.from("quizzes").select("*").order("updated_at", { ascending: false })));
  },

  async getQuiz(id) {
    const sb = await db();
    const quiz = maybe(await sb.from("quizzes").select("*").eq("id", id).maybeSingle());
    if (!quiz) return null;
    const qs = check(await sb.from("questions").select("*, question_options(*)").eq("quiz_id", id).order("sort_order"));
    return { ...toQuiz(quiz), questions: qs.map(toQuestion) };
  },

  async createQuiz(input) {
    const sb = await db();
    return toQuiz(check(await sb.from("quizzes").insert(fromQuizInput(input)).select().single()));
  },

  async updateQuiz(id, input) {
    const sb = await db();
    return toQuiz(check(await sb.from("quizzes").update(fromQuizInput(input)).eq("id", id).select().single()));
  },

  async deleteQuiz(id) {
    const sb = await db();
    ok(await sb.from("quizzes").delete().eq("id", id));
  },

  async saveQuestion(quizId, input, questionId) {
    const sb = await db();
    const id = check(
      await sb.rpc("admin_save_question", {
        p_quiz_id: quizId,
        p_question_id: questionId ?? null,
        p_text: input.text,
        p_explanation: input.explanation,
        p_order: input.order,
        p_options: input.options,
      }),
    ) as string;
    const row = check(await sb.from("questions").select("*, question_options(*)").eq("id", id).single());
    return toQuestion(row);
  },

  async deleteQuestion(questionId) {
    const sb = await db();
    ok(await sb.from("questions").delete().eq("id", questionId));
  },

  async createReport(input) {
    const sb = await db();
    // Không .select(): khách không có quyền đọc lại bảng reports.
    ok(await sb.from("reports").insert({ target_type: input.targetType, target_id: input.targetId, message: input.message }));
  },

  async listReports() {
    const sb = await db();
    return check(await sb.from("reports").select("*").order("created_at", { ascending: false })).map(
      (r: Row): Report => ({
        id: r.id,
        targetType: r.target_type,
        targetId: r.target_id,
        message: r.message,
        status: r.status,
        createdAt: r.created_at,
      }),
    );
  },

  async setReportStatus(id, status) {
    const sb = await db();
    ok(
      await sb
        .from("reports")
        .update({ status, resolved_at: status === "resolved" ? new Date().toISOString() : null })
        .eq("id", id),
    );
  },
};

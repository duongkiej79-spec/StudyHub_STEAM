import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { gradeQuestions } from "../grading";
import { buildSeedDocuments, buildSeedQuizzes, seedCatalog, type SampleManifest } from "../seed-data";
import type { AttemptSummary, Catalog, Question, Quiz, QuizAttempt, QuizSummary, Report, StudyDocument } from "../types";
import type { PublicQuiz, Repository } from "./types";

/**
 * Kho dữ liệu cục bộ: một tệp JSON, ghi nguyên tử (ghi tệp tạm rồi đổi tên),
 * mọi thao tác ghi được xếp hàng tuần tự trong tiến trình.
 * Phù hợp phát triển và demo trên một máy; KHÔNG dùng cho môi trường nhiều máy chủ
 * hoặc hệ thống tệp chỉ đọc (như Vercel) — khi đó dùng DATA_BACKEND=supabase.
 */

/** Tài khoản học sinh ở chế độ local. Mật khẩu chỉ lưu dạng băm scrypt. */
export interface LocalUser {
  id: string;
  email: string;
  displayName: string;
  passwordHash: string;
  createdAt: string;
}

interface Favorite {
  userId: string;
  documentId: string;
  createdAt: string;
}

interface DbShape {
  version: 1;
  catalog: Catalog;
  documents: StudyDocument[];
  quizzes: Quiz[];
  questions: Question[];
  attempts: QuizAttempt[];
  reports: Report[];
  users: LocalUser[];
  favorites: Favorite[];
}

/** Nâng cấp tệp db.json tạo từ phiên bản cũ (chưa có users/favorites) mà không mất dữ liệu. */
function normalize(db: DbShape): DbShape {
  db.users ??= [];
  db.favorites ??= [];
  db.reports ??= [];
  db.attempts ??= [];
  return db;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const MANIFEST_PATH = path.join(process.cwd(), "storage", "samples", "manifest.json");

let cache: { db: DbShape; mtimeMs: number } | null = null;
let writeQueue: Promise<unknown> = Promise.resolve();

async function seed(): Promise<DbShape> {
  let manifest: SampleManifest = {};
  try {
    manifest = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  } catch {
    // Chưa sinh PDF mẫu — tài liệu vẫn hiển thị, chỉ thiếu kích thước/số trang.
  }
  const { quizzes, questions } = buildSeedQuizzes();
  return {
    version: 1,
    catalog: structuredClone(seedCatalog),
    documents: buildSeedDocuments(manifest),
    quizzes,
    questions,
    attempts: [],
    reports: [],
    users: [],
    favorites: [],
  };
}

async function persist(db: DbShape) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const tmp = `${DB_PATH}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf8");
  await fs.rename(tmp, DB_PATH);
  const st = await fs.stat(DB_PATH);
  cache = { db, mtimeMs: st.mtimeMs };
}

async function load(): Promise<DbShape> {
  try {
    const st = await fs.stat(DB_PATH);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.db;
    const db = normalize(JSON.parse(await fs.readFile(DB_PATH, "utf8")) as DbShape);
    cache = { db, mtimeMs: st.mtimeMs };
    return db;
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    const db = await seed();
    try {
      await persist(db);
    } catch {
      // Hệ thống tệp chỉ đọc: vẫn phục vụ dữ liệu mẫu ở chế độ chỉ đọc.
      cache = { db, mtimeMs: -1 };
    }
    return db;
  }
}

/** Đọc: trả bản sao để nơi gọi không vô tình sửa bộ nhớ đệm. */
async function read<T>(fn: (db: DbShape) => T): Promise<T> {
  return structuredClone(fn(await load()));
}

/** Ghi: tuần tự hóa, đọc bản mới nhất, sửa, lưu. */
function write<T>(fn: (db: DbShape) => T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = structuredClone(await load());
    const result = fn(db);
    await persist(db);
    return structuredClone(result);
  });
  writeQueue = run.catch(() => undefined);
  return run;
}

const now = () => new Date().toISOString();

function notFound(what: string): never {
  throw new Error(`Không tìm thấy ${what}`);
}

function summarize(db: DbShape, quizzes: Quiz[]): QuizSummary[] {
  return quizzes
    .map((q) => ({ ...q, questionCount: db.questions.filter((x) => x.quizId === q.id).length }))
    .sort((a, b) => a.gradeId - b.gradeId || a.subjectId.localeCompare(b.subjectId) || a.title.localeCompare(b.title, "vi"));
}

export const localRepo: Repository = {
  // ---------------- Danh mục
  getCatalog: () => read((db) => db.catalog),

  createChapter: (input) =>
    write((db) => {
      const ch = { ...input, id: randomUUID() };
      db.catalog.chapters.push(ch);
      return ch;
    }),

  createLesson: (input) =>
    write((db) => {
      if (!db.catalog.chapters.some((c) => c.id === input.chapterId)) notFound("chương");
      const l = { ...input, id: randomUUID() };
      db.catalog.lessons.push(l);
      return l;
    }),

  // ---------------- Tài liệu
  listPublishedDocuments: () => read((db) => db.documents.filter((d) => d.status === "published")),
  getPublishedDocument: (id) => read((db) => db.documents.find((d) => d.id === id && d.status === "published") ?? null),
  listAllDocuments: () =>
    read((db) => [...db.documents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))),
  getDocument: (id) => read((db) => db.documents.find((d) => d.id === id) ?? null),

  createDocument: (input) =>
    write((db) => {
      const t = now();
      const doc: StudyDocument = {
        ...input,
        id: randomUUID(),
        reviewNote: null,
        createdAt: t,
        updatedAt: t,
        publishedAt: input.status === "published" ? t : null,
      };
      db.documents.push(doc);
      return doc;
    }),

  updateDocument: (id, patch) =>
    write((db) => {
      const doc = db.documents.find((d) => d.id === id) ?? notFound("tài liệu");
      Object.assign(doc, patch, { updatedAt: now() });
      return doc;
    }),

  deleteDocument: (id) =>
    write((db) => {
      db.documents = db.documents.filter((d) => d.id !== id);
      db.favorites = db.favorites.filter((f) => f.documentId !== id);
    }),

  // ---------------- Trắc nghiệm (học sinh)
  listPublishedQuizzes: () => read((db) => summarize(db, db.quizzes.filter((q) => q.isPublished))),

  getPublicQuiz: (id) =>
    read((db): PublicQuiz | null => {
      const quiz = db.quizzes.find((q) => q.id === id && q.isPublished);
      if (!quiz) return null;
      return {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        gradeId: quiz.gradeId,
        subjectId: quiz.subjectId,
        chapterId: quiz.chapterId,
        durationMinutes: quiz.durationMinutes,
        questions: db.questions
          .filter((q) => q.quizId === id)
          .sort((a, b) => a.order - b.order)
          .map((q) => ({ id: q.id, text: q.text, order: q.order, options: q.options.map((o) => ({ id: o.id, text: o.text })) })),
      };
    }),

  gradeQuiz: (quizId, answers, userId) =>
    write((db) => {
      const quiz = db.quizzes.find((q) => q.id === quizId && q.isPublished);
      if (!quiz) return null;
      const result = gradeQuestions(quizId, db.questions.filter((q) => q.quizId === quizId), answers);
      const validUser = userId && db.users.some((u) => u.id === userId) ? userId : null;
      db.attempts.push({
        id: randomUUID(),
        quizId,
        userId: validUser,
        correctCount: result.correctCount,
        total: result.total,
        score: result.score,
        submittedAt: now(),
        // Chỉ lưu lựa chọn khi có tài khoản (khách: chỉ lưu điểm ẩn danh).
        ...(validUser
          ? { answers: Object.fromEntries(result.questions.filter((q) => q.selectedOptionId).map((q) => [q.questionId, q.selectedOptionId!])) }
          : {}),
      });
      return result;
    }),

  // ---------------- Tài khoản học sinh (P1)
  listFavorites: (userId) =>
    read((db) => {
      const ids = db.favorites
        .filter((f) => f.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((f) => f.documentId);
      return ids
        .map((id) => db.documents.find((d) => d.id === id && d.status === "published"))
        .filter((d): d is StudyDocument => !!d);
    }),

  isFavorite: (userId, documentId) => read((db) => db.favorites.some((f) => f.userId === userId && f.documentId === documentId)),

  setFavorite: (userId, documentId, on) =>
    write((db) => {
      const exists = db.favorites.some((f) => f.userId === userId && f.documentId === documentId);
      if (on && !exists) {
        if (!db.users.some((u) => u.id === userId)) notFound("tài khoản");
        if (!db.documents.some((d) => d.id === documentId && d.status === "published")) notFound("tài liệu");
        db.favorites.push({ userId, documentId, createdAt: now() });
      }
      if (!on) db.favorites = db.favorites.filter((f) => !(f.userId === userId && f.documentId === documentId));
    }),

  listAttempts: (userId) =>
    read((db): AttemptSummary[] =>
      db.attempts
        .filter((a) => a.userId === userId)
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
        .flatMap((a) => {
          const quiz = db.quizzes.find((q) => q.id === a.quizId);
          if (!quiz) return [];
          return [{
            id: a.id,
            quizId: a.quizId,
            quizTitle: quiz.title,
            gradeId: quiz.gradeId,
            subjectId: quiz.subjectId,
            correctCount: a.correctCount,
            total: a.total,
            score: a.score,
            submittedAt: a.submittedAt,
          }];
        }),
    ),

  getAttemptResult: (userId, attemptId) =>
    read((db) => {
      const a = db.attempts.find((x) => x.id === attemptId && x.userId === userId);
      if (!a) return null;
      // Chấm lại lựa chọn đã lưu theo nội dung đề hiện tại; điểm tổng giữ nguyên như lúc nộp.
      const regraded = gradeQuestions(a.quizId, db.questions.filter((q) => q.quizId === a.quizId), a.answers ?? {});
      return { ...regraded, correctCount: a.correctCount, total: a.total, score: a.score };
    }),

  // ---------------- Trắc nghiệm (quản trị)
  listAllQuizzes: () => read((db) => summarize(db, db.quizzes)),

  getQuiz: (id) =>
    read((db) => {
      const quiz = db.quizzes.find((q) => q.id === id);
      if (!quiz) return null;
      return { ...quiz, questions: db.questions.filter((q) => q.quizId === id).sort((a, b) => a.order - b.order) };
    }),

  createQuiz: (input) =>
    write((db) => {
      const t = now();
      const quiz: Quiz = { ...input, id: randomUUID(), createdAt: t, updatedAt: t };
      db.quizzes.push(quiz);
      return quiz;
    }),

  updateQuiz: (id, input) =>
    write((db) => {
      const quiz = db.quizzes.find((q) => q.id === id) ?? notFound("đề");
      Object.assign(quiz, input, { updatedAt: now() });
      return quiz;
    }),

  deleteQuiz: (id) =>
    write((db) => {
      db.quizzes = db.quizzes.filter((q) => q.id !== id);
      db.questions = db.questions.filter((q) => q.quizId !== id);
      db.attempts = db.attempts.filter((a) => a.quizId !== id);
    }),

  saveQuestion: (quizId, input, questionId) =>
    write((db) => {
      if (!db.quizzes.some((q) => q.id === quizId)) notFound("đề");
      const options = input.options.map((o) => ({ id: randomUUID(), text: o.text, isCorrect: o.isCorrect }));
      if (questionId) {
        const q = db.questions.find((x) => x.id === questionId && x.quizId === quizId) ?? notFound("câu hỏi");
        Object.assign(q, { text: input.text, explanation: input.explanation, order: input.order, options });
        return q;
      }
      const q: Question = { id: randomUUID(), quizId, text: input.text, explanation: input.explanation, order: input.order, options };
      db.questions.push(q);
      return q;
    }),

  deleteQuestion: (questionId) =>
    write((db) => {
      db.questions = db.questions.filter((q) => q.id !== questionId);
    }),

  // ---------------- Báo lỗi
  createReport: (input) =>
    write((db) => {
      db.reports.push({ ...input, id: randomUUID(), status: "open", createdAt: now() });
    }),

  listReports: () => read((db) => [...db.reports].sort((a, b) => b.createdAt.localeCompare(a.createdAt))),

  setReportStatus: (id, status) =>
    write((db) => {
      const r = db.reports.find((x) => x.id === id) ?? notFound("báo lỗi");
      r.status = status;
    }),
};

// ---------------------------------------------------------------- Kho tài khoản (chỉ chế độ local)
// Supabase tự quản lý tài khoản (auth.users) nên phần này không nằm trong Repository.

export const localUsers = {
  findByEmail: (email: string) => read((db) => db.users.find((u) => u.email === email.toLowerCase()) ?? null),
  findById: (id: string) => read((db) => db.users.find((u) => u.id === id) ?? null),
  create: (input: { email: string; displayName: string; passwordHash: string }) =>
    write((db) => {
      const email = input.email.toLowerCase();
      if (db.users.some((u) => u.email === email)) return null; // email đã tồn tại
      const user: LocalUser = { id: randomUUID(), email, displayName: input.displayName, passwordHash: input.passwordHash, createdAt: now() };
      db.users.push(user);
      return user;
    }),
};

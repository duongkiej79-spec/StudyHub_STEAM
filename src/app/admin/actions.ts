"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, signInAdmin, signOutAdmin } from "@/lib/auth";
import { getCatalog, getRepo } from "@/lib/repo";
import { changeDocumentStatus, checkClassification } from "@/lib/services/documents";
import { inspectPdf, newUploadKey, putFile, removeFile } from "@/lib/storage";
import type { DocumentStatus } from "@/lib/types";
import {
  chapterFormSchema,
  documentFormSchema,
  documentStatusSchema,
  fieldErrors,
  lessonFormSchema,
  questionFormSchema,
  quizFormSchema,
  rightsConfirmSchema,
  uuid,
} from "@/lib/validation";

/**
 * Server actions của khu quản trị.
 * QUY TẮC: mọi hàm ghi dữ liệu phải gọi `await requireAdmin()` ở dòng đầu tiên.
 */

export type FormState = { ok?: boolean; message?: string; errors?: Record<string, string>; seq?: number };

const str = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

function backWithError(path: string, message: string): never {
  redirect(`${path}?loi=${encodeURIComponent(message)}`);
}

// ---------------------------------------------------------------- Đăng nhập

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email");
  const password = str(fd, "password");
  if (!email || !password) return { message: "Nhập email và mật khẩu." };
  const error = await signInAdmin(email, password);
  if (error) return { message: error };
  redirect("/admin");
}

export async function logoutAction() {
  await signOutAdmin();
  redirect("/admin/login");
}

// ---------------------------------------------------------------- Tài liệu (F08, F10)

export async function saveDocumentAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const repo = getRepo();
  const idRaw = str(fd, "id");
  const id = idRaw ? uuid.safeParse(idRaw) : null;
  if (id && !id.success) return { message: "Mã tài liệu không hợp lệ." };
  const existing = id?.success ? await repo.getDocument(id.data) : null;
  if (id?.success && !existing) return { message: "Tài liệu không còn tồn tại." };

  const parsed = documentFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const errors: Record<string, string> = {};
  if (!existing && !rightsConfirmSchema.safeParse(fd.get("rightsConfirmed")).success) {
    errors.rightsConfirmed = "Cần xác nhận tài liệu được phép chia sẻ.";
  }
  const classError = checkClassification(input, await getCatalog());
  if (classError) errors.chapterId = classError;

  // Tệp PDF (không bắt buộc khi sửa)
  const file = fd.get("file");
  let upload: { bytes: Uint8Array; pageCount: number } | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.type && file.type !== "application/pdf") errors.file = "Chỉ nhận tệp PDF.";
    else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const check = await inspectPdf(bytes);
      if (!check.ok) errors.file = check.error;
      else upload = { bytes, pageCount: check.pageCount };
    }
  }

  const intentRaw = str(fd, "intent");
  const intent: DocumentStatus | null = existing ? null : intentRaw === "published" || intentRaw === "pending" ? intentRaw : "draft";
  if (intent === "published" && !upload && !errors.file) errors.file = "Cần tải tệp PDF trước khi công khai.";
  if (Object.keys(errors).length) return { errors };

  let newKey: string | null = null;
  let savedId: string;
  try {
    if (upload) {
      newKey = newUploadKey();
      await putFile(newKey, upload.bytes);
    }
    const fileInfo = upload && newKey ? { filePath: newKey, fileSize: upload.bytes.byteLength, pageCount: upload.pageCount } : null;

    if (existing) {
      await repo.updateDocument(existing.id, { ...input, ...(fileInfo ?? {}) });
      if (fileInfo && existing.filePath) await removeFile(existing.filePath);
      savedId = existing.id;
    } else {
      const created = await repo.createDocument({
        ...input,
        filePath: fileInfo?.filePath ?? null,
        fileSize: fileInfo?.fileSize ?? null,
        pageCount: fileInfo?.pageCount ?? null,
        status: intent ?? "draft",
      });
      savedId = created.id;
    }
  } catch (e) {
    // Lưu CSDL thất bại sau khi đã tải tệp lên → xóa tệp mồ côi.
    if (newKey) await removeFile(newKey).catch(() => undefined);
    console.error("saveDocumentAction", e);
    return { message: "Không lưu được tài liệu. Vui lòng thử lại." };
  }
  redirect(`/admin/tai-lieu/${savedId}?da-luu=1`);
}

export async function setDocumentStatusAction(fd: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(str(fd, "id"));
  const status = documentStatusSchema.safeParse(str(fd, "status"));
  if (!id.success || !status.success) redirect("/admin/tai-lieu");
  const path = `/admin/tai-lieu/${id.data}`;
  const doc = await getRepo().getDocument(id.data);
  if (!doc) redirect("/admin/tai-lieu");
  const note = str(fd, "reviewNote").trim().slice(0, 500) || null;
  try {
    await changeDocumentStatus(doc, status.data, note);
  } catch (e) {
    backWithError(path, (e as Error).message);
  }
  redirect(`${path}?da-luu=1`);
}

export async function deleteDocumentAction(fd: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(str(fd, "id"));
  if (!id.success) redirect("/admin/tai-lieu");
  const repo = getRepo();
  const doc = await repo.getDocument(id.data);
  if (doc) {
    await repo.deleteDocument(doc.id);
    if (doc.filePath) await removeFile(doc.filePath);
  }
  redirect("/admin/tai-lieu?da-xoa=1");
}

// ---------------------------------------------------------------- Đề & câu hỏi (F09)

export async function saveQuizAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = quizFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const catalog = await getCatalog();
  if (!catalog.subjects.some((s) => s.id === parsed.data.subjectId)) return { errors: { subjectId: "Môn học không tồn tại." } };
  if (parsed.data.chapterId) {
    const ch = catalog.chapters.find((c) => c.id === parsed.data.chapterId);
    if (!ch || ch.gradeId !== parsed.data.gradeId || ch.subjectId !== parsed.data.subjectId) {
      return { errors: { chapterId: "Chủ đề không thuộc khối/môn đã chọn." } };
    }
  }

  const repo = getRepo();
  const idRaw = str(fd, "id");
  if (idRaw) {
    const id = uuid.safeParse(idRaw);
    if (!id.success) return { message: "Mã đề không hợp lệ." };
    const quiz = await repo.getQuiz(id.data);
    if (!quiz) return { message: "Đề không còn tồn tại." };
    if (parsed.data.isPublished && quiz.questions.length === 0) return { errors: { isPublished: "Cần ít nhất 1 câu hỏi trước khi xuất bản." } };
    await repo.updateQuiz(id.data, parsed.data);
    refresh();
    return { ok: true, message: "Đã lưu thông tin đề." };
  }
  const created = await repo.createQuiz({ ...parsed.data, isPublished: false });
  redirect(`/admin/de-thi/${created.id}`);
}

export async function deleteQuizAction(fd: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(str(fd, "id"));
  if (id.success) await getRepo().deleteQuiz(id.data);
  redirect("/admin/de-thi?da-xoa=1");
}

export async function saveQuestionAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const quizId = uuid.safeParse(str(fd, "quizId"));
  if (!quizId.success) return { message: "Mã đề không hợp lệ." };
  const parsed = questionFormSchema.safeParse({
    text: fd.get("text"),
    explanation: fd.get("explanation"),
    order: fd.get("order"),
    options: [0, 1, 2, 3].map((i) => fd.get(`option_${i}`) ?? ""),
    correct: fd.get("correct") ?? -1,
  });
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { text, explanation, order, options, correct } = parsed.data;

  const qidRaw = str(fd, "questionId");
  const qid = qidRaw ? uuid.safeParse(qidRaw) : null;
  if (qid && !qid.success) return { message: "Mã câu hỏi không hợp lệ." };
  try {
    await getRepo().saveQuestion(
      quizId.data,
      { text, explanation, order, options: options.map((o, i) => ({ text: o, isCorrect: i === correct })) },
      qid?.data,
    );
  } catch (e) {
    return { message: (e as Error).message };
  }
  refresh(); // tải lại danh sách câu hỏi trên trang
  return { ok: true, message: qid ? "Đã lưu câu hỏi." : "Đã thêm câu hỏi.", seq: qid ? undefined : Date.now() };
}

export async function deleteQuestionAction(fd: FormData) {
  await requireAdmin();
  const quizId = uuid.safeParse(str(fd, "quizId"));
  const qid = uuid.safeParse(str(fd, "questionId"));
  if (!quizId.success) redirect("/admin/de-thi");
  const repo = getRepo();
  if (qid.success) {
    await repo.deleteQuestion(qid.data);
    // Đề đã xuất bản mà hết câu hỏi thì tự gỡ xuất bản.
    const quiz = await repo.getQuiz(quizId.data);
    if (quiz && quiz.isPublished && quiz.questions.length === 0) await repo.updateQuiz(quiz.id, { isPublished: false });
  }
  redirect(`/admin/de-thi/${quizId.data}`);
}

// ---------------------------------------------------------------- Phân loại (F01)

export async function createChapterAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = chapterFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const catalog = await getCatalog();
  if (!catalog.subjects.some((s) => s.id === parsed.data.subjectId)) return { errors: { subjectId: "Môn học không tồn tại." } };
  const siblings = catalog.chapters.filter((c) => c.gradeId === parsed.data.gradeId && c.subjectId === parsed.data.subjectId);
  await getRepo().createChapter({ ...parsed.data, order: Math.max(0, ...siblings.map((c) => c.order)) + 1 });
  refresh();
  return { ok: true, message: `Đã thêm chương “${parsed.data.title}”.`, seq: Date.now() };
}

export async function createLessonAction(_prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = lessonFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const catalog = await getCatalog();
  if (!catalog.chapters.some((c) => c.id === parsed.data.chapterId)) return { errors: { chapterId: "Chương không tồn tại." } };
  const siblings = catalog.lessons.filter((l) => l.chapterId === parsed.data.chapterId);
  await getRepo().createLesson({ ...parsed.data, order: Math.max(0, ...siblings.map((l) => l.order)) + 1 });
  refresh();
  return { ok: true, message: `Đã thêm bài “${parsed.data.title}”.`, seq: Date.now() };
}

// ---------------------------------------------------------------- Báo lỗi (F12)

export async function setReportStatusAction(fd: FormData) {
  await requireAdmin();
  const id = uuid.safeParse(str(fd, "id"));
  const status = str(fd, "status");
  if (id.success && (status === "open" || status === "resolved")) await getRepo().setReportStatus(id.data, status);
  redirect("/admin/bao-loi");
}

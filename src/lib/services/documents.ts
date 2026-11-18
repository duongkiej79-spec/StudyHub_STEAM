import "server-only";
import { getRepo } from "../repo";
import type { Catalog, DocumentInput, DocumentStatus, StudyDocument } from "../types";

/**
 * Quy tắc nghiệp vụ cho tài liệu, tách khỏi tầng lưu trữ để cả hai backend dùng chung.
 */

/** Các bước chuyển trạng thái hợp lệ trong quy trình duyệt (F10). */
const TRANSITIONS: Record<DocumentStatus, DocumentStatus[]> = {
  draft: ["pending", "published", "hidden"],
  pending: ["published", "rejected", "draft"],
  published: ["hidden", "draft"],
  rejected: ["draft", "pending"],
  hidden: ["published", "draft"],
};

export function allowedTransitions(from: DocumentStatus): DocumentStatus[] {
  return TRANSITIONS[from];
}

/** Bảo đảm chương/bài thuộc đúng khối & môn đã chọn (F01). Trả thông báo lỗi hoặc null. */
export function checkClassification(input: DocumentInput, catalog: Catalog): string | null {
  if (!catalog.subjects.some((s) => s.id === input.subjectId)) return "Môn học không tồn tại.";
  if (input.seriesId && !catalog.series.some((s) => s.id === input.seriesId)) return "Bộ sách không tồn tại.";
  if (input.chapterId) {
    const ch = catalog.chapters.find((c) => c.id === input.chapterId);
    if (!ch) return "Chương không tồn tại.";
    if (ch.gradeId !== input.gradeId || ch.subjectId !== input.subjectId) return "Chương không thuộc khối/môn đã chọn.";
  }
  if (input.lessonId) {
    const l = catalog.lessons.find((x) => x.id === input.lessonId);
    if (!l) return "Bài học không tồn tại.";
    if (!input.chapterId || l.chapterId !== input.chapterId) return "Bài học không thuộc chương đã chọn.";
  }
  return null;
}

export async function changeDocumentStatus(
  doc: StudyDocument,
  to: DocumentStatus,
  reviewNote: string | null,
): Promise<StudyDocument> {
  if (to === doc.status) return doc;
  if (!TRANSITIONS[doc.status].includes(to)) {
    throw new Error(`Không thể chuyển từ "${doc.status}" sang "${to}".`);
  }
  if (to === "published" && !doc.filePath) throw new Error("Cần tải tệp PDF trước khi công khai.");
  return getRepo().updateDocument(doc.id, {
    status: to,
    reviewNote,
    publishedAt: to === "published" ? (doc.publishedAt ?? new Date().toISOString()) : doc.publishedAt,
  });
}

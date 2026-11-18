import type { DocumentStatus, DocumentType, ReportStatus } from "./types";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  ly_thuyet: "Lý thuyết",
  tom_tat: "Tóm tắt / Công thức",
  bai_tap: "Bài tập có lời giải",
  de_kiem_tra: "Đề kiểm tra / Ôn thi",
};

export const DOCUMENT_STATUS_LABEL: Record<DocumentStatus, string> = {
  draft: "Nháp",
  pending: "Chờ duyệt",
  published: "Công khai",
  rejected: "Từ chối",
  hidden: "Ẩn",
};

export const DOCUMENT_STATUS_TONE: Record<DocumentStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  hidden: "bg-zinc-200 text-zinc-700",
};

export const REPORT_STATUS_LABEL: Record<ReportStatus, string> = {
  open: "Chưa xử lý",
  resolved: "Đã xử lý",
};

/** Giới hạn tệp tải lên (yêu cầu phi chức năng: kiểm tra định dạng & dung lượng). */
export const MAX_PDF_BYTES = 10 * 1024 * 1024;

export function formatBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
}

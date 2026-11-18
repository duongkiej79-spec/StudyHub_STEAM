import { z } from "zod";
import { DOCUMENT_STATUSES, DOCUMENT_TYPES } from "./types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const uuid = z.string().regex(UUID_RE, "Mã không hợp lệ");

/** Trường chọn không bắt buộc trong form: "" → null. */
const optional = <T extends z.ZodType>(inner: T) =>
  z.preprocess((v) => (v === "" || v === undefined ? null : v), inner.nullable());

const gradeId = z.coerce
  .number()
  .refine((n): n is 10 | 11 | 12 => n === 10 || n === 11 || n === 12, "Khối lớp không hợp lệ")
  .transform((n) => n as 10 | 11 | 12);

const slug = z.string().regex(/^[a-z0-9-]{1,40}$/, "Giá trị không hợp lệ");

export const documentFormSchema = z.object({
  title: z.string().trim().min(3, "Tên tài liệu cần ít nhất 3 ký tự").max(200),
  gradeId,
  subjectId: slug,
  seriesId: optional(slug),
  chapterId: optional(uuid),
  lessonId: optional(uuid),
  type: z.enum(DOCUMENT_TYPES, { message: "Chọn loại học liệu" }),
  description: z.string().trim().max(2000).default(""),
  source: z.string().trim().min(2, "Bắt buộc ghi nguồn (tác giả / đơn vị / đường dẫn)").max(300),
  licenseNote: z.string().trim().min(2, "Bắt buộc ghi quyền chia sẻ").max(300),
});

export const rightsConfirmSchema = z.literal("on", { message: "Cần xác nhận tài liệu được phép chia sẻ" });

export const documentStatusSchema = z.enum(DOCUMENT_STATUSES);

export const quizFormSchema = z.object({
  title: z.string().trim().min(3, "Tên đề cần ít nhất 3 ký tự").max(200),
  description: z.string().trim().max(1000).default(""),
  gradeId,
  subjectId: slug,
  chapterId: optional(uuid),
  durationMinutes: optional(z.coerce.number().int().min(1).max(180)),
  isPublished: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export const questionFormSchema = z.object({
  text: z.string().trim().min(2, "Nhập nội dung câu hỏi").max(2000),
  explanation: z.string().trim().max(2000).default(""),
  order: z.coerce.number().int().min(0).max(1000),
  options: z
    .array(z.string().trim().min(1, "Không để trống phương án").max(500))
    .length(4, "Cần đủ 4 phương án"),
  correct: z.coerce.number().int().min(0, "Chọn đáp án đúng").max(3, "Chọn đáp án đúng"),
});

export const answersSchema = z.record(uuid, uuid).refine((r) => Object.keys(r).length <= 200, "Quá nhiều câu trả lời");

export const reportFormSchema = z.object({
  targetType: z.enum(["document", "question"]),
  targetId: uuid,
  message: z.string().trim().min(5, "Mô tả lỗi cần ít nhất 5 ký tự").max(1000),
});

export const chapterFormSchema = z.object({
  gradeId,
  subjectId: slug,
  seriesId: optional(slug),
  title: z.string().trim().min(2).max(200),
});

export const lessonFormSchema = z.object({
  chapterId: uuid,
  title: z.string().trim().min(2).max(200),
});

/** Gom lỗi zod thành { tênTrường: thông báo đầu tiên }. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "_");
    if (!out[k]) out[k] = issue.message;
  }
  return out;
}

// ---------- Tài khoản học sinh (P1) ----------

export const registerFormSchema = z
  .object({
    displayName: z.string().trim().min(2, "Tên hiển thị cần ít nhất 2 ký tự").max(60, "Tên hiển thị tối đa 60 ký tự"),
    email: z.string().trim().toLowerCase().pipe(z.email({ message: "Email không hợp lệ" })),
    password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Mật khẩu nhập lại không khớp" });

export const loginFormSchema = z.object({
  email: z.string().trim().min(1, "Nhập email"),
  password: z.string().min(1, "Nhập mật khẩu"),
});

/** Chỉ cho phép quay lại đường dẫn nội bộ ("/..."), chặn open redirect kiểu "//evil.com". */
export function safeNext(next: unknown, fallback = "/tai-khoan"): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next.slice(0, 300);
}

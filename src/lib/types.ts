/**
 * Kiểu dữ liệu miền (domain) của StudyHub.
 * Ánh xạ 1-1 với các bảng trong supabase/migrations/0001_schema.sql
 * (tên trường camelCase ở đây <-> snake_case trong CSDL).
 */

// ---------- Phân loại (F01) ----------

export type GradeId = 10 | 11 | 12;

export interface Grade {
  id: GradeId;
  name: string; // "Lớp 10"
  slug: string; // "lop-10" — dùng trên URL
}

export interface Subject {
  id: string; // slug, ví dụ "toan", "ngu-van"
  name: string;
  order: number;
}

export interface TextbookSeries {
  id: string; // slug, ví dụ "ket-noi"
  name: string; // "Kết nối tri thức với cuộc sống"
}

export interface Chapter {
  id: string;
  gradeId: GradeId;
  subjectId: string;
  seriesId: string | null;
  title: string;
  order: number;
}

export interface Lesson {
  id: string;
  chapterId: string;
  title: string;
  order: number;
}

export interface Catalog {
  grades: Grade[];
  subjects: Subject[];
  series: TextbookSeries[];
  chapters: Chapter[];
  lessons: Lesson[];
}

// ---------- Tài liệu (F04, F05, F08, F10) ----------

export const DOCUMENT_TYPES = ["ly_thuyet", "tom_tat", "bai_tap", "de_kiem_tra"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/** Nháp → Chờ duyệt → Công khai / Từ chối / Ẩn */
export const DOCUMENT_STATUSES = ["draft", "pending", "published", "rejected", "hidden"] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface StudyDocument {
  id: string;
  title: string;
  gradeId: GradeId;
  subjectId: string;
  seriesId: string | null;
  chapterId: string | null;
  lessonId: string | null;
  type: DocumentType;
  description: string;
  /** Khóa tệp trong kho lưu trữ (không phải URL công khai). */
  filePath: string | null;
  fileSize: number | null;
  pageCount: number | null;
  /** Tác giả / đơn vị / đường dẫn nguồn. */
  source: string;
  /** Ghi chú quyền chia sẻ (tự biên soạn, CC BY, được phép đăng...). */
  licenseNote: string;
  status: DocumentStatus;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Dữ liệu người quản trị nhập khi tạo/sửa tài liệu. */
export type DocumentInput = Pick<
  StudyDocument,
  | "title"
  | "gradeId"
  | "subjectId"
  | "seriesId"
  | "chapterId"
  | "lessonId"
  | "type"
  | "description"
  | "source"
  | "licenseNote"
>;

export type FileInfo = Pick<StudyDocument, "filePath" | "fileSize" | "pageCount">;

// ---------- Trắc nghiệm (F06, F07, F09) ----------

export interface Quiz {
  id: string;
  title: string;
  description: string;
  gradeId: GradeId;
  subjectId: string;
  chapterId: string | null;
  durationMinutes: number | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuizSummary extends Quiz {
  questionCount: number;
}

export type QuizInput = Pick<
  Quiz,
  "title" | "description" | "gradeId" | "subjectId" | "chapterId" | "durationMinutes" | "isPublished"
>;

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  explanation: string;
  order: number;
  options: QuestionOption[];
}

export interface QuestionInput {
  text: string;
  explanation: string;
  order: number;
  options: { text: string; isCorrect: boolean }[];
}

export interface QuizWithQuestions extends Quiz {
  questions: Question[];
}

/** Phiên bản gửi xuống trình duyệt: KHÔNG có đáp án đúng và lời giải. */
export interface PublicQuestion {
  id: string;
  text: string;
  order: number;
  options: { id: string; text: string }[];
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  userId: string | null;
  correctCount: number;
  total: number;
  /** Điểm thang 10. */
  score: number;
  submittedAt: string;
  /** Lựa chọn đã nộp — chỉ lưu khi người làm có tài khoản (để xem lại). */
  answers?: Record<string, string>;
}

export interface GradedQuestion {
  questionId: string;
  text: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
  options: { id: string; text: string }[];
}

export interface QuizResult {
  quizId: string;
  correctCount: number;
  total: number;
  score: number;
  questions: GradedQuestion[];
}

// ---------- Báo lỗi (F12) ----------

export type ReportTarget = "document" | "question";
export type ReportStatus = "open" | "resolved";

export interface Report {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  message: string;
  status: ReportStatus;
  createdAt: string;
}

// ---------- Tài khoản học sinh (F11 — P1) ----------

export type UserRole = "student" | "admin";

/** Người dùng đang đăng nhập. Chỉ thu thập tối thiểu: email + tên hiển thị. */
export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
}

/** Một dòng trong lịch sử luyện tập. */
export interface AttemptSummary {
  id: string;
  quizId: string;
  quizTitle: string;
  gradeId: GradeId;
  subjectId: string;
  correctCount: number;
  total: number;
  score: number;
  submittedAt: string;
}

import type {
  AttemptSummary,
  Catalog,
  Chapter,
  DocumentInput,
  DocumentStatus,
  FileInfo,
  Lesson,
  PublicQuestion,
  Question,
  QuestionInput,
  Quiz,
  QuizInput,
  QuizResult,
  QuizSummary,
  QuizWithQuestions,
  Report,
  ReportStatus,
  ReportTarget,
  StudyDocument,
} from "../types";

export type DocumentPatch = Partial<DocumentInput> &
  Partial<FileInfo> & {
    status?: DocumentStatus;
    reviewNote?: string | null;
    publishedAt?: string | null;
  };

export interface PublicQuiz extends Omit<Quiz, "isPublished" | "createdAt" | "updatedAt"> {
  questions: PublicQuestion[];
}

/**
 * Hợp đồng truy cập dữ liệu. Mọi trang/hành động chỉ nói chuyện với interface này,
 * nên có thể đổi kho (tệp JSON cục bộ ↔ Supabase) mà không sửa giao diện.
 *
 * Quy ước quyền: các phương thức "đọc công khai" chỉ trả nội dung đã xuất bản;
 * các phương thức ghi PHẢI được gọi sau requireAdmin() (src/lib/auth).
 * Với Supabase, RLS trong CSDL là lớp bảo vệ thứ hai.
 */
export interface Repository {
  // Danh mục
  getCatalog(): Promise<Catalog>;
  createChapter(input: Omit<Chapter, "id">): Promise<Chapter>;
  createLesson(input: Omit<Lesson, "id">): Promise<Lesson>;

  // Tài liệu
  listPublishedDocuments(): Promise<StudyDocument[]>;
  getPublishedDocument(id: string): Promise<StudyDocument | null>;
  /** [admin] mọi trạng thái */
  listAllDocuments(): Promise<StudyDocument[]>;
  /** [admin] */
  getDocument(id: string): Promise<StudyDocument | null>;
  createDocument(input: DocumentInput & FileInfo & { status: DocumentStatus }): Promise<StudyDocument>;
  updateDocument(id: string, patch: DocumentPatch): Promise<StudyDocument>;
  deleteDocument(id: string): Promise<void>;

  // Trắc nghiệm — luồng học sinh
  listPublishedQuizzes(): Promise<QuizSummary[]>;
  /** Đề không kèm đáp án. */
  getPublicQuiz(id: string): Promise<PublicQuiz | null>;
  /**
   * Chấm điểm phía server và ghi lượt làm bài. null nếu đề không tồn tại/chưa xuất bản.
   * `userId` = người đang đăng nhập (null = khách); chỉ khi có tài khoản mới lưu lựa chọn để xem lại.
   * (Supabase lấy người dùng từ phiên đăng nhập qua auth.uid(), tham số chỉ dùng cho kho local.)
   */
  gradeQuiz(quizId: string, answers: Record<string, string>, userId: string | null): Promise<QuizResult | null>;

  // Tài khoản học sinh (P1) — luôn lọc theo userId của người đang đăng nhập
  listFavorites(userId: string): Promise<StudyDocument[]>;
  isFavorite(userId: string, documentId: string): Promise<boolean>;
  setFavorite(userId: string, documentId: string, on: boolean): Promise<void>;
  listAttempts(userId: string): Promise<AttemptSummary[]>;
  /** Xem lại một lượt làm bài; null nếu không tồn tại hoặc không phải của userId. */
  getAttemptResult(userId: string, attemptId: string): Promise<QuizResult | null>;

  // Trắc nghiệm — quản trị
  listAllQuizzes(): Promise<QuizSummary[]>;
  getQuiz(id: string): Promise<QuizWithQuestions | null>;
  createQuiz(input: QuizInput): Promise<Quiz>;
  updateQuiz(id: string, input: Partial<QuizInput>): Promise<Quiz>;
  deleteQuiz(id: string): Promise<void>;
  saveQuestion(quizId: string, input: QuestionInput, questionId?: string): Promise<Question>;
  deleteQuestion(questionId: string): Promise<void>;

  // Báo lỗi
  createReport(input: { targetType: ReportTarget; targetId: string; message: string }): Promise<void>;
  listReports(): Promise<Report[]>;
  setReportStatus(id: string, status: ReportStatus): Promise<void>;
}

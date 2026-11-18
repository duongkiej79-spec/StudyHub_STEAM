"use server";

import { headers } from "next/headers";
import { getCurrentUser } from "@/lib/auth";
import { getRepo } from "@/lib/repo";
import type { QuizResult } from "@/lib/types";
import { answersSchema, fieldErrors, reportFormSchema, uuid } from "@/lib/validation";

// ---------------------------------------------------------------- Nộp bài (F07)

export type SubmitQuizResult = { ok: true; result: QuizResult } | { ok: false; error: string };

/**
 * Chấm điểm hoàn toàn phía server: trình duyệt chỉ gửi lựa chọn,
 * đáp án đúng và lời giải chỉ được trả về SAU khi nộp.
 */
export async function submitQuiz(quizId: string, answers: Record<string, string>): Promise<SubmitQuizResult> {
  if (!uuid.safeParse(quizId).success) return { ok: false, error: "Đề không hợp lệ." };
  const parsed = answersSchema.safeParse(answers);
  if (!parsed.success) return { ok: false, error: "Dữ liệu bài làm không hợp lệ." };
  try {
    const user = await getCurrentUser();
    const result = await getRepo().gradeQuiz(quizId, parsed.data, user?.id ?? null);
    if (!result) return { ok: false, error: "Đề không tồn tại hoặc đã ngừng xuất bản." };
    return { ok: true, result };
  } catch (e) {
    console.error("submitQuiz", e);
    return { ok: false, error: "Không nộp được bài, vui lòng thử lại." };
  }
}

// ---------------------------------------------------------------- Báo lỗi (F12)

export type ReportState = { status: "idle" | "ok" | "error"; message?: string; errors?: Record<string, string> };

const recent = new Map<string, number[]>();
const REPORT_LIMIT = 5;
const REPORT_WINDOW_MS = 10 * 60 * 1000;

export async function submitReport(_prev: ReportState, formData: FormData): Promise<ReportState> {
  // Bẫy bot: trường ẩn phải để trống.
  if (formData.get("website")) return { status: "ok", message: "Cảm ơn bạn đã báo lỗi!" };

  const parsed = reportFormSchema.safeParse({
    targetType: formData.get("targetType"),
    targetId: formData.get("targetId"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { status: "error", errors: fieldErrors(parsed.error) };

  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? "local").trim();
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < REPORT_WINDOW_MS);
  if (times.length >= REPORT_LIMIT) {
    return { status: "error", message: "Bạn gửi quá nhiều báo lỗi, vui lòng thử lại sau ít phút." };
  }
  recent.set(ip, [...times, now]);

  try {
    await getRepo().createReport(parsed.data);
    return { status: "ok", message: "Cảm ơn bạn đã báo lỗi! Nhóm nội dung sẽ kiểm tra sớm." };
  } catch (e) {
    console.error("submitReport", e);
    return { status: "error", message: "Không gửi được, vui lòng thử lại." };
  }
}

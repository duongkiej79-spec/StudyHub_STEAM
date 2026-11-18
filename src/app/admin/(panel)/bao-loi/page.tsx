import Link from "next/link";
import { setReportStatusAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate, REPORT_STATUS_LABEL } from "@/lib/labels";
import { getRepo } from "@/lib/repo";

export default async function ReportsPage() {
  await requireAdmin();
  const repo = getRepo();
  const [reports, docs, quizzes] = await Promise.all([repo.listReports(), repo.listAllDocuments(), repo.listAllQuizzes()]);
  const docTitle = new Map(docs.map((d) => [d.id, d.title]));

  // Báo lỗi câu hỏi: tìm đề chứa câu hỏi để dẫn link sửa.
  const questionQuiz = new Map<string, { quizId: string; title: string }>();
  const neededQuestionIds = new Set(reports.filter((r) => r.targetType === "question").map((r) => r.targetId));
  if (neededQuestionIds.size) {
    for (const q of quizzes) {
      const full = await repo.getQuiz(q.id);
      full?.questions.forEach((x) => neededQuestionIds.has(x.id) && questionQuiz.set(x.id, { quizId: q.id, title: q.title }));
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-ink">Báo lỗi từ người dùng</h1>
      {reports.length === 0 ? (
        <p className="card p-6 text-sm text-muted">Chưa có báo lỗi nào.</p>
      ) : (
        <ul className="space-y-3">
          {reports.map((r) => {
            const target =
              r.targetType === "document"
                ? { href: `/admin/tai-lieu/${r.targetId}`, label: `Tài liệu: ${docTitle.get(r.targetId) ?? "(đã xóa)"}` }
                : questionQuiz.get(r.targetId)
                  ? { href: `/admin/de-thi/${questionQuiz.get(r.targetId)!.quizId}`, label: `Câu hỏi trong đề: ${questionQuiz.get(r.targetId)!.title}` }
                  : { href: null, label: "Câu hỏi (đã xóa)" };
            return (
              <li key={r.id} className={`card p-4 ${r.status === "resolved" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    {target.href ? (
                      <Link href={target.href} className="font-medium text-brand-700 hover:underline">{target.label}</Link>
                    ) : (
                      <span className="font-medium text-muted">{target.label}</span>
                    )}
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{r.message}</p>
                    <p className="mt-1 text-xs text-muted">{formatDate(r.createdAt)} · {REPORT_STATUS_LABEL[r.status]}</p>
                  </div>
                  <form action={setReportStatusAction}>
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="status" value={r.status === "open" ? "resolved" : "open"} />
                    <button type="submit" className="btn-secondary py-1.5">{r.status === "open" ? "Đánh dấu đã xử lý" : "Mở lại"}</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

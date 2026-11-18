import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { formatDate } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { QuizForm } from "./quiz-forms";

export default async function AdminQuizzes({ searchParams }: PageProps<"/admin/de-thi">) {
  await requireAdmin();
  const sp = await searchParams;
  const [catalog, quizzes] = await Promise.all([getCatalog(), getRepo().listAllQuizzes()]);
  const idx = catalogIndex(catalog);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-4">
        <h1 className="text-2xl font-bold text-ink">Đề & câu hỏi</h1>
        {sp["da-xoa"] && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Đã xóa đề.</p>}
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Đề</th>
                <th className="px-4 py-3">Khối / Môn</th>
                <th className="px-4 py-3">Số câu</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Cập nhật</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {quizzes.map((q) => (
                <tr key={q.id}>
                  <td className="px-4 py-3">
                    <Link href={`/admin/de-thi/${q.id}`} className="font-medium text-ink hover:text-brand-700">{q.title}</Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{idx.docMeta(q)}</td>
                  <td className="px-4 py-3 tabular-nums">{q.questionCount}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${q.isPublished ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                      {q.isPublished ? "Đã xuất bản" : "Nháp"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{formatDate(q.updatedAt)}</td>
                </tr>
              ))}
              {quizzes.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-muted">Chưa có đề nào.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <aside className="card h-fit p-5">
        <h2 className="mb-4 font-semibold text-ink">Tạo đề mới</h2>
        <QuizForm catalog={catalog} />
      </aside>
    </div>
  );
}

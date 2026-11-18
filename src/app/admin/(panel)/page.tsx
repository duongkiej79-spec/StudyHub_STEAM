import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { DOCUMENT_STATUS_LABEL, formatDate } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { DOCUMENT_STATUSES } from "@/lib/types";

export default async function AdminHome() {
  await requireAdmin();
  const repo = getRepo();
  const [catalog, docs, quizzes, reports] = await Promise.all([getCatalog(), repo.listAllDocuments(), repo.listAllQuizzes(), repo.listReports()]);
  const idx = catalogIndex(catalog);
  const pending = docs.filter((d) => d.status === "pending");
  const openReports = reports.filter((r) => r.status === "open");

  const stats = [
    ...DOCUMENT_STATUSES.map((s) => ({ label: `Tài liệu ${DOCUMENT_STATUS_LABEL[s].toLowerCase()}`, value: docs.filter((d) => d.status === s).length, href: `/admin/tai-lieu?trang-thai=${s}` })),
    { label: "Bộ đề", value: quizzes.length, href: "/admin/de-thi" },
    { label: "Câu hỏi", value: quizzes.reduce((n, q) => n + q.questionCount, 0), href: "/admin/de-thi" },
    { label: "Báo lỗi chưa xử lý", value: openReports.length, href: "/admin/bao-loi" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Tổng quan</h1>
        <div className="flex gap-2">
          <Link href="/admin/tai-lieu/moi" className="btn-primary">+ Thêm tài liệu</Link>
          <Link href="/admin/de-thi" className="btn-secondary">+ Tạo đề</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-brand-200">
            <div className="text-2xl font-bold tabular-nums text-ink">{s.value}</div>
            <div className="text-sm text-muted">{s.label}</div>
          </Link>
        ))}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-ink">Chờ duyệt ({pending.length})</h2>
        {pending.length ? (
          <ul className="card divide-y divide-line">
            {pending.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <Link href={`/admin/tai-lieu/${d.id}`} className="font-medium text-ink hover:text-brand-700">{d.title}</Link>
                  <div className="text-xs text-muted">{idx.docMeta(d)} · cập nhật {formatDate(d.updatedAt)}</div>
                </div>
                <Link href={`/admin/tai-lieu/${d.id}`} className="btn-secondary py-1.5">Duyệt</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="card p-4 text-sm text-muted">Không có tài liệu nào đang chờ duyệt.</p>
        )}
      </section>
    </div>
  );
}

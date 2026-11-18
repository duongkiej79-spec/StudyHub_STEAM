import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, DOCUMENT_TYPE_LABEL, formatDate } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { DOCUMENT_STATUSES, type DocumentStatus } from "@/lib/types";
import { normalizeVi } from "@/lib/text";

export default async function AdminDocuments({ searchParams }: PageProps<"/admin/tai-lieu">) {
  await requireAdmin();
  const sp = await searchParams;
  const statusParam = typeof sp["trang-thai"] === "string" ? sp["trang-thai"] : "";
  const status = (DOCUMENT_STATUSES as readonly string[]).includes(statusParam) ? (statusParam as DocumentStatus) : undefined;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 100) : "";

  const [catalog, docs] = await Promise.all([getCatalog(), getRepo().listAllDocuments()]);
  const idx = catalogIndex(catalog);
  const nq = normalizeVi(q);
  const shown = docs.filter((d) => (!status || d.status === status) && (!nq || normalizeVi(d.title).includes(nq)));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-ink">Tài liệu</h1>
        <Link href="/admin/tai-lieu/moi" className="btn-primary">+ Thêm tài liệu</Link>
      </div>
      {sp["da-xoa"] && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Đã xóa tài liệu.</p>}

      <div className="flex flex-wrap items-center gap-2">
        <Link href="/admin/tai-lieu" className={`chip ${!status ? "chip-active" : ""}`}>Tất cả ({docs.length})</Link>
        {DOCUMENT_STATUSES.map((s) => (
          <Link key={s} href={`/admin/tai-lieu?trang-thai=${s}`} className={`chip ${status === s ? "chip-active" : ""}`}>
            {DOCUMENT_STATUS_LABEL[s]} ({docs.filter((d) => d.status === s).length})
          </Link>
        ))}
        <form className="ml-auto flex gap-2" action="/admin/tai-lieu">
          {status && <input type="hidden" name="trang-thai" value={status} />}
          <label htmlFor="admin-q" className="sr-only">Lọc theo tên</label>
          <input id="admin-q" name="q" defaultValue={q} placeholder="Lọc theo tên…" className="input py-2" />
        </form>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-3">Tài liệu</th>
              <th className="px-4 py-3">Khối / Môn</th>
              <th className="px-4 py-3">Loại</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Cập nhật</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {shown.map((d) => (
              <tr key={d.id} className="hover:bg-surface/60">
                <td className="px-4 py-3">
                  <Link href={`/admin/tai-lieu/${d.id}`} className="font-medium text-ink hover:text-brand-700">{d.title}</Link>
                  {!d.filePath && <span className="ml-2 text-xs text-amber-700">(chưa có tệp)</span>}
                </td>
                <td className="px-4 py-3 text-muted">{idx.docMeta(d)}</td>
                <td className="px-4 py-3 text-muted">{DOCUMENT_TYPE_LABEL[d.type]}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_STATUS_TONE[d.status]}`}>{DOCUMENT_STATUS_LABEL[d.status]}</span>
                </td>
                <td className="px-4 py-3 text-muted">{formatDate(d.updatedAt)}</td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">Không có tài liệu.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

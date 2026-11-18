import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteDocumentAction, setDocumentStatusAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireAdmin } from "@/lib/auth";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_STATUS_TONE, formatDate } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { allowedTransitions } from "@/lib/services/documents";
import type { DocumentStatus } from "@/lib/types";
import { uuid } from "@/lib/validation";
import { DocumentForm } from "../document-form";

const ACTION_LABEL: Record<DocumentStatus, string> = {
  draft: "Chuyển về nháp",
  pending: "Gửi duyệt",
  published: "Duyệt & công khai",
  rejected: "Từ chối",
  hidden: "Ẩn tài liệu",
};

export default async function EditDocumentPage({ params, searchParams }: PageProps<"/admin/tai-lieu/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!uuid.safeParse(id).success) notFound();
  const [catalog, doc] = await Promise.all([getCatalog(), getRepo().getDocument(id)]);
  if (!doc) notFound();
  const transitions = allowedTransitions(doc.status);
  const error = typeof sp.loi === "string" ? sp.loi : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        <Link href="/admin/tai-lieu" className="text-sm text-muted hover:text-ink">← Danh sách tài liệu</Link>
        <h1 className="mt-2 text-2xl font-bold text-ink">{doc.title}</h1>
        {sp["da-luu"] && <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">Đã lưu.</p>}
        {error && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p>}
        <div className="card mt-5 p-5">
          <DocumentForm catalog={catalog} doc={doc} key={doc.updatedAt} />
        </div>
      </div>

      <aside className="space-y-4">
        <section className="card p-4">
          <h2 className="font-semibold text-ink">Kiểm duyệt</h2>
          <p className="mt-2 text-sm">
            Trạng thái:{" "}
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${DOCUMENT_STATUS_TONE[doc.status]}`}>{DOCUMENT_STATUS_LABEL[doc.status]}</span>
          </p>
          <p className="mt-1 text-xs text-muted">
            Tạo {formatDate(doc.createdAt)} · Cập nhật {formatDate(doc.updatedAt)}
            {doc.publishedAt && ` · Công khai ${formatDate(doc.publishedAt)}`}
          </p>
          {doc.reviewNote && <p className="mt-2 rounded bg-surface p-2 text-sm">Ghi chú duyệt: {doc.reviewNote}</p>}
          <form action={setDocumentStatusAction} className="mt-4 space-y-3">
            <input type="hidden" name="id" value={doc.id} />
            <div>
              <label htmlFor="reviewNote" className="label">Ghi chú (không bắt buộc)</label>
              <textarea id="reviewNote" name="reviewNote" rows={2} maxLength={500} className="input" placeholder="Lý do từ chối, cần sửa gì…" />
            </div>
            <div className="flex flex-wrap gap-2">
              {transitions.map((t) => (
                <button
                  key={t}
                  type="submit"
                  name="status"
                  value={t}
                  disabled={t === "published" && !doc.filePath}
                  className={t === "published" ? "btn-primary py-2" : t === "rejected" || t === "hidden" ? "btn-danger py-2" : "btn-secondary py-2"}
                >
                  {ACTION_LABEL[t]}
                </button>
              ))}
            </div>
            {!doc.filePath && <p className="text-xs text-amber-700">Cần tải tệp PDF trước khi công khai.</p>}
          </form>
        </section>

        {doc.filePath && (
          <section className="card p-4">
            <h2 className="font-semibold text-ink">Tệp</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`/api/tai-lieu/${doc.id}/tep`} target="_blank" rel="noopener" className="btn-secondary py-2">Xem PDF</a>
              {doc.status === "published" && (
                <Link href={`/tai-lieu/${doc.id}`} className="btn-secondary py-2">Trang công khai</Link>
              )}
            </div>
          </section>
        )}

        <section className="card p-4">
          <h2 className="font-semibold text-ink">Xóa tài liệu</h2>
          <p className="mt-1 text-sm text-muted">Xóa vĩnh viễn tài liệu và tệp đã tải lên. Nếu chỉ muốn tạm gỡ, hãy dùng “Ẩn tài liệu”.</p>
          <form action={deleteDocumentAction} className="mt-3">
            <input type="hidden" name="id" value={doc.id} />
            <ConfirmSubmit message={`Xóa vĩnh viễn “${doc.title}”? Thao tác này không hoàn tác được.`}>Xóa vĩnh viễn</ConfirmSubmit>
          </form>
        </section>
      </aside>
    </div>
  );
}

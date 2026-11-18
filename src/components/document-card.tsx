import Link from "next/link";
import type { CatalogIndex } from "@/lib/catalog";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import type { StudyDocument } from "@/lib/types";

/** Thẻ tài liệu: tiêu đề, môn, lớp, loại, mô tả ngắn, nút Xem / Tải (mục 6 đặc tả). */
export function DocumentCard({ doc, idx }: { doc: StudyDocument; idx: CatalogIndex }) {
  const lesson = idx.lesson(doc.lessonId);
  return (
    <article className="card flex h-full flex-col p-4 transition-shadow hover:shadow-md">
      <div className="mb-2 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="rounded-full bg-brand-50 px-2 py-0.5 font-medium text-brand-700">{idx.docMeta(doc)}</span>
        <span className="rounded-full bg-surface px-2 py-0.5 text-muted">{DOCUMENT_TYPE_LABEL[doc.type]}</span>
      </div>
      <h3 className="font-semibold leading-snug text-ink">
        <Link href={`/tai-lieu/${doc.id}`} className="hover:text-brand-700">
          {doc.title}
        </Link>
      </h3>
      {lesson && <p className="mt-1 text-xs text-muted">Bài: {lesson.title}</p>}
      <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{doc.description}</p>
      <div className="mt-4 flex gap-2">
        <Link href={`/tai-lieu/${doc.id}`} className="btn-primary flex-1 py-2">
          Xem
        </Link>
        {doc.filePath && (
          <a href={`/api/tai-lieu/${doc.id}/tep?tai=1`} className="btn-secondary flex-1 py-2" download>
            Tải PDF
          </a>
        )}
      </div>
    </article>
  );
}

export function DocumentGrid({ docs, idx }: { docs: StudyDocument[]; idx: CatalogIndex }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {docs.map((d) => (
        <DocumentCard key={d.id} doc={d} idx={idx} />
      ))}
    </div>
  );
}

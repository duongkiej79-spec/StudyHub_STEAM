import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentGrid } from "@/components/document-card";
import { Breadcrumbs, EmptyState } from "@/components/site-chrome";
import { catalogIndex } from "@/lib/catalog";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/thu-vien/[lop]/[mon]">): Promise<Metadata> {
  const { lop, mon } = await params;
  const idx = catalogIndex(await getCatalog());
  const g = idx.gradeBySlug(lop);
  const s = idx.subject(mon);
  return { title: g && s ? `${s.name} ${g.name}` : "Không tìm thấy" };
}

export default async function SubjectPage({ params, searchParams }: PageProps<"/thu-vien/[lop]/[mon]">) {
  const { lop, mon } = await params;
  const sp = await searchParams;
  const loai = typeof sp.loai === "string" && (DOCUMENT_TYPES as readonly string[]).includes(sp.loai) ? (sp.loai as DocumentType) : undefined;

  const repo = getRepo();
  const [catalog, allDocs, quizzes] = await Promise.all([getCatalog(), repo.listPublishedDocuments(), repo.listPublishedQuizzes()]);
  const idx = catalogIndex(catalog);
  const grade = idx.gradeBySlug(lop);
  const subject = idx.subject(mon);
  if (!grade || !subject) notFound();

  const docs = allDocs.filter((d) => d.gradeId === grade.id && d.subjectId === subject.id && (!loai || d.type === loai));
  const chapters = idx.chaptersOf(grade.id, subject.id);
  const unclassified = docs.filter((d) => !d.chapterId || !chapters.some((c) => c.id === d.chapterId));
  const relatedQuizzes = quizzes.filter((q) => q.gradeId === grade.id && q.subjectId === subject.id);
  const base = `/thu-vien/${grade.slug}/${subject.id}`;

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { href: "/", label: "Trang chủ" },
          { href: "/thu-vien", label: "Thư viện" },
          { href: `/thu-vien/${grade.slug}`, label: grade.name },
          { label: subject.name },
        ]}
      />
      <h1 className="text-2xl font-bold text-ink">
        {subject.name} – {grade.name}
      </h1>

      <div className="mt-4 flex flex-wrap gap-2" aria-label="Lọc theo loại tài liệu">
        <Link href={base} className={`chip ${!loai ? "chip-active" : ""}`}>
          Tất cả
        </Link>
        {DOCUMENT_TYPES.map((t) => (
          <Link key={t} href={`${base}?loai=${t}`} className={`chip ${loai === t ? "chip-active" : ""}`}>
            {DOCUMENT_TYPE_LABEL[t]}
          </Link>
        ))}
      </div>

      {relatedQuizzes.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 p-4 text-sm">
          <span className="font-semibold text-brand-900">Luyện tập:</span>
          {relatedQuizzes.map((q) => (
            <Link key={q.id} href={`/luyen-tap/${q.id}`} className="chip">
              {q.title} · {q.questionCount} câu
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 space-y-10">
        {chapters.map((ch) => {
          const lessons = idx.lessonsOf(ch.id);
          const chDocs = docs.filter((d) => d.chapterId === ch.id);
          if (!chDocs.length && loai) return null;
          const series = idx.series(ch.seriesId);
          return (
            <section key={ch.id} aria-labelledby={`ch-${ch.id}`}>
              <h2 id={`ch-${ch.id}`} className="text-lg font-bold text-ink">
                {ch.title}
              </h2>
              {series && <p className="text-xs text-muted">Bộ sách: {series.name}</p>}
              {chDocs.length === 0 ? (
                <p className="mt-3 text-sm text-muted">Chưa có tài liệu cho chương này.</p>
              ) : (
                <div className="mt-4 space-y-6">
                  {lessons.map((l) => {
                    const lDocs = chDocs.filter((d) => d.lessonId === l.id);
                    if (!lDocs.length) return null;
                    return (
                      <div key={l.id}>
                        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">{l.title}</h3>
                        <DocumentGrid docs={lDocs} idx={idx} />
                      </div>
                    );
                  })}
                  {chDocs.some((d) => !d.lessonId) && (
                    <div>
                      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">Tài liệu chung của chương</h3>
                      <DocumentGrid docs={chDocs.filter((d) => !d.lessonId)} idx={idx} />
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}

        {unclassified.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-ink">Tài liệu khác</h2>
            <div className="mt-4">
              <DocumentGrid docs={unclassified} idx={idx} />
            </div>
          </section>
        )}

        {docs.length === 0 && (
          <EmptyState title="Chưa có tài liệu phù hợp">
            {loai ? (
              <Link href={base} className="text-brand-700 hover:underline">
                Bỏ lọc loại tài liệu
              </Link>
            ) : (
              "Nhóm nội dung đang bổ sung tài liệu cho môn này."
            )}
          </EmptyState>
        )}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DocumentGrid } from "@/components/document-card";
import { FavoriteButton } from "@/components/favorite-button";
import { PdfViewer } from "@/components/pdf-viewer";
import { ReportForm } from "@/components/report-form";
import { Breadcrumbs } from "@/components/site-chrome";
import { getCurrentUser } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { DOCUMENT_STATUS_LABEL, DOCUMENT_TYPE_LABEL, formatBytes, formatDate } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!uuid.safeParse(id).success) return null;
  return getRepo().getPublishedDocument(id);
}

export async function generateMetadata({ params }: PageProps<"/tai-lieu/[id]">): Promise<Metadata> {
  const doc = await load((await params).id);
  return doc ? { title: doc.title, description: doc.description } : { title: "Không tìm thấy tài liệu" };
}

export default async function DocumentPage({ params }: PageProps<"/tai-lieu/[id]">) {
  const { id } = await params;
  const doc = await load(id);
  if (!doc) notFound();

  const repo = getRepo();
  const user = await getCurrentUser();
  const [catalog, all, quizzes, isFav] = await Promise.all([
    getCatalog(),
    repo.listPublishedDocuments(),
    repo.listPublishedQuizzes(),
    user ? repo.isFavorite(user.id, doc.id) : Promise.resolve(false),
  ]);
  const idx = catalogIndex(catalog);
  const grade = idx.grade(doc.gradeId)!;
  const subject = idx.subject(doc.subjectId);
  const chapter = idx.chapter(doc.chapterId);
  const lesson = idx.lesson(doc.lessonId);
  const series = idx.series(doc.seriesId);
  const related = all
    .filter((d) => d.id !== doc.id && d.gradeId === doc.gradeId && d.subjectId === doc.subjectId)
    .sort((a, b) => Number(b.chapterId === doc.chapterId) - Number(a.chapterId === doc.chapterId))
    .slice(0, 3);
  const quiz = quizzes.find((q) => q.chapterId && q.chapterId === doc.chapterId);
  const fileUrl = `/api/tai-lieu/${doc.id}/tep`;
  const downloadUrl = `${fileUrl}?tai=1`;

  const info: [string, React.ReactNode][] = [
    ["Khối / Môn", `${grade.name} / ${subject?.name ?? doc.subjectId}`],
    ["Loại", DOCUMENT_TYPE_LABEL[doc.type]],
    ...(series ? ([["Bộ sách", series.name]] as [string, string][]) : []),
    ...(chapter ? ([["Chương", chapter.title]] as [string, string][]) : []),
    ...(lesson ? ([["Bài", lesson.title]] as [string, string][]) : []),
    ["Số trang", doc.pageCount ?? "—"],
    ["Dung lượng", formatBytes(doc.fileSize)],
    ["Cập nhật", formatDate(doc.updatedAt)],
    ["Nguồn", doc.source],
    ["Quyền chia sẻ", doc.licenseNote],
    ["Trạng thái", <span key="s" className="font-medium text-emerald-700">Đã duyệt · {DOCUMENT_STATUS_LABEL[doc.status]}</span>],
  ];

  return (
    <div className="container-page py-8">
      <Breadcrumbs
        items={[
          { href: "/thu-vien", label: "Thư viện" },
          { href: `/thu-vien/${grade.slug}`, label: grade.name },
          { href: `/thu-vien/${grade.slug}/${doc.subjectId}`, label: subject?.name ?? doc.subjectId },
          { label: doc.title },
        ]}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold leading-tight text-ink">{doc.title}</h1>
          {doc.description && <p className="mt-2 text-muted">{doc.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {doc.filePath && (
              <a href={downloadUrl} className="btn-primary" download>
                Tải PDF{doc.fileSize ? ` (${formatBytes(doc.fileSize)})` : ""}
              </a>
            )}
            <FavoriteButton documentId={doc.id} initial={isFav} loggedIn={!!user} />
            {quiz && (
              <Link href={`/luyen-tap/${quiz.id}`} className="btn-secondary">
                Luyện tập: {quiz.title}
              </Link>
            )}
          </div>
          <div className="mt-6">
            {doc.filePath ? (
              <PdfViewer src={fileUrl} downloadHref={downloadUrl} />
            ) : (
              <p className="card p-6 text-sm text-muted">Tài liệu chưa có tệp đính kèm.</p>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <section className="card p-4">
            <h2 className="mb-3 font-semibold text-ink">Thông tin tài liệu</h2>
            <dl className="space-y-2 text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[110px_1fr] gap-2">
                  <dt className="text-muted">{k}</dt>
                  <dd className="break-words text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
          <ReportForm targetType="document" targetId={doc.id} />
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold text-ink">Tài liệu liên quan</h2>
          <DocumentGrid docs={related} idx={idx} />
        </section>
      )}
    </div>
  );
}

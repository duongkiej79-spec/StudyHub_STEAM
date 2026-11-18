import Link from "next/link";
import { DocumentGrid } from "@/components/document-card";
import { SearchBox } from "@/components/search-box";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const repo = getRepo();
  const [catalog, docs, quizzes] = await Promise.all([getCatalog(), repo.listPublishedDocuments(), repo.listPublishedQuizzes()]);
  const idx = catalogIndex(catalog);
  const latest = [...docs].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 6);

  return (
    <>
      <section className="border-b border-line bg-gradient-to-b from-brand-50 to-white">
        <div className="container-page py-12 sm:py-16">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Dành cho học sinh lớp 10 · 11 · 12</p>
          <h1 className="mt-2 max-w-2xl text-3xl font-bold leading-tight text-ink sm:text-4xl">
            Tìm đúng tài liệu, luyện trắc nghiệm có lời giải
          </h1>
          <p className="mt-3 max-w-xl text-muted">
            Tài liệu theo môn, chương, bài. Xem PDF ngay trên web hoặc tải về miễn phí, không cần đăng nhập.
          </p>
          <div className="mt-6 max-w-2xl">
            <SearchBox size="lg" />
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {catalog.grades.map((g) => (
              <Link key={g.id} href={`/thu-vien/${g.slug}`} className="btn-secondary px-6 text-base">
                {g.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="text-xl font-bold text-ink">Môn học</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {idx.subjectsSorted().map((s) => {
            const count = docs.filter((d) => d.subjectId === s.id).length;
            return (
              <Link key={s.id} href={`/tim-kiem?mon=${s.id}`} className="card p-4 hover:border-brand-200 hover:bg-brand-50">
                <div className="font-semibold text-ink">{s.name}</div>
                <div className="mt-1 text-xs text-muted">{count} tài liệu</div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="container-page py-4">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-xl font-bold text-ink">Tài liệu mới</h2>
          <Link href="/tim-kiem?sap-xep=moi-nhat" className="text-sm font-medium text-brand-700 hover:underline">
            Xem tất cả
          </Link>
        </div>
        <div className="mt-4">
          <DocumentGrid docs={latest} idx={idx} />
        </div>
      </section>

      <section className="container-page py-10">
        <div className="card flex flex-col gap-4 bg-brand-900 p-6 text-white sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-xl font-bold">Luyện trắc nghiệm</h2>
            <p className="mt-1 text-sm text-brand-100">
              {quizzes.length} bộ đề theo lớp và môn. Nộp bài là có điểm ngay, kèm giải thích từng câu.
            </p>
          </div>
          <Link href="/luyen-tap" className="btn bg-white text-brand-900 hover:bg-brand-50">
            Bắt đầu luyện tập
          </Link>
        </div>
      </section>
    </>
  );
}

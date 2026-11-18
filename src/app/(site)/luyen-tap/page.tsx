import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, EmptyState } from "@/components/site-chrome";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Luyện trắc nghiệm" };

export default async function PracticePage({ searchParams }: PageProps<"/luyen-tap">) {
  const sp = await searchParams;
  const [catalog, quizzes] = await Promise.all([getCatalog(), getRepo().listPublishedQuizzes()]);
  const idx = catalogIndex(catalog);
  const lop = Number(sp.lop);
  const grade = catalog.grades.find((g) => g.id === lop)?.id;
  const subject = typeof sp.mon === "string" ? idx.subject(sp.mon)?.id : undefined;

  const shown = quizzes.filter((q) => (!grade || q.gradeId === grade) && (!subject || q.subjectId === subject) && q.questionCount > 0);
  const href = (g?: number, s?: string) => {
    const p = new URLSearchParams();
    if (g) p.set("lop", String(g));
    if (s) p.set("mon", s);
    const q = p.toString();
    return q ? `/luyen-tap?${q}` : "/luyen-tap";
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ href: "/", label: "Trang chủ" }, { label: "Luyện tập" }]} />
      <h1 className="text-2xl font-bold text-ink">Luyện trắc nghiệm</h1>
      <p className="mt-1 text-muted">Chọn lớp, môn rồi chọn bộ đề. Không cần đăng nhập, kết quả chỉ mình bạn thấy.</p>

      <div className="mt-5 space-y-3">
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo lớp">
          <Link href={href(undefined, subject)} className={`chip ${!grade ? "chip-active" : ""}`}>Tất cả lớp</Link>
          {catalog.grades.map((g) => (
            <Link key={g.id} href={href(g.id, subject)} className={`chip ${grade === g.id ? "chip-active" : ""}`}>{g.name}</Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Lọc theo môn">
          <Link href={href(grade, undefined)} className={`chip ${!subject ? "chip-active" : ""}`}>Tất cả môn</Link>
          {idx.subjectsSorted().map((s) => (
            <Link key={s.id} href={href(grade, s.id)} className={`chip ${subject === s.id ? "chip-active" : ""}`}>{s.name}</Link>
          ))}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((q) => {
          const chapter = idx.chapter(q.chapterId);
          return (
            <article key={q.id} className="card flex flex-col p-5">
              <div className="text-xs font-medium text-brand-700">{idx.docMeta(q)}</div>
              <h2 className="mt-1 text-lg font-semibold text-ink">{q.title}</h2>
              {chapter && <p className="text-xs text-muted">Chủ đề: {chapter.title}</p>}
              <p className="mt-2 flex-1 text-sm text-muted">{q.description}</p>
              <p className="mt-3 text-sm text-ink">
                {q.questionCount} câu{q.durationMinutes ? ` · ${q.durationMinutes} phút` : ""}
              </p>
              <Link href={`/luyen-tap/${q.id}`} className="btn-primary mt-4">Làm bài</Link>
            </article>
          );
        })}
      </div>
      {shown.length === 0 && (
        <div className="mt-6">
          <EmptyState title="Chưa có bộ đề cho lựa chọn này">
            <Link href="/luyen-tap" className="text-brand-700 hover:underline">Xem tất cả bộ đề</Link>
          </EmptyState>
        </div>
      )}
    </div>
  );
}

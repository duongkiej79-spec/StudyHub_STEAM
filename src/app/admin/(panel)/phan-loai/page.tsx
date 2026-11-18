import { requireAdmin } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog } from "@/lib/repo";
import { ChapterForm, LessonForm } from "./catalog-forms";

export default async function CatalogAdminPage() {
  await requireAdmin();
  const catalog = await getCatalog();
  const idx = catalogIndex(catalog);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="min-w-0 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-ink">Phân loại</h1>
          <p className="mt-1 text-sm text-muted">Cấu trúc chuẩn: Khối lớp → Môn học → (Bộ sách) → Chương → Bài → Tài liệu / Bộ câu hỏi.</p>
        </div>
        {catalog.grades.map((g) => (
          <section key={g.id} className="card p-5">
            <h2 className="text-lg font-bold text-ink">{g.name}</h2>
            <div className="mt-3 space-y-4">
              {idx.subjectsSorted().map((s) => {
                const chapters = idx.chaptersOf(g.id, s.id);
                if (!chapters.length) return null;
                return (
                  <div key={s.id}>
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{s.name}</h3>
                    <ul className="mt-2 space-y-2">
                      {chapters.map((c) => (
                        <li key={c.id} className="rounded-lg bg-surface p-3 text-sm">
                          <div className="font-medium text-ink">
                            {c.title}
                            {c.seriesId && <span className="ml-2 text-xs font-normal text-muted">({idx.series(c.seriesId)?.name})</span>}
                          </div>
                          <ul className="mt-1 list-inside list-disc text-muted">
                            {idx.lessonsOf(c.id).map((l) => <li key={l.id}>{l.title}</li>)}
                          </ul>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <aside className="space-y-4">
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Thêm chương</h2>
          <ChapterForm catalog={catalog} />
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-semibold text-ink">Thêm bài</h2>
          <LessonForm catalog={catalog} />
        </section>
      </aside>
    </div>
  );
}

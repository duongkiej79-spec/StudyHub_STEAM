import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/site-chrome";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/thu-vien/[lop]">): Promise<Metadata> {
  const { lop } = await params;
  const grade = catalogIndex(await getCatalog()).gradeBySlug(lop);
  return { title: grade ? `Tài liệu ${grade.name}` : "Không tìm thấy" };
}

export default async function GradePage({ params }: PageProps<"/thu-vien/[lop]">) {
  const { lop } = await params;
  const [catalog, docs] = await Promise.all([getCatalog(), getRepo().listPublishedDocuments()]);
  const idx = catalogIndex(catalog);
  const grade = idx.gradeBySlug(lop);
  if (!grade) notFound();

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ href: "/", label: "Trang chủ" }, { href: "/thu-vien", label: "Thư viện" }, { label: grade.name }]} />
      <h1 className="text-2xl font-bold text-ink">{grade.name}</h1>
      <p className="mt-1 text-muted">Chọn môn học để xem tài liệu theo chương và bài.</p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {idx.subjectsSorted().map((s) => {
          const n = docs.filter((d) => d.gradeId === grade.id && d.subjectId === s.id).length;
          const chapters = idx.chaptersOf(grade.id, s.id).length;
          return (
            <Link key={s.id} href={`/thu-vien/${grade.slug}/${s.id}`} className="card p-5 hover:border-brand-200 hover:bg-brand-50">
              <div className="text-lg font-semibold text-ink">{s.name}</div>
              <div className="mt-1 text-sm text-muted">
                {chapters} chương · {n} tài liệu
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

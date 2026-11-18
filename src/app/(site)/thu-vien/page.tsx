import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/site-chrome";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Thư viện" };

export default async function LibraryPage() {
  const [catalog, docs] = await Promise.all([getCatalog(), getRepo().listPublishedDocuments()]);
  const idx = catalogIndex(catalog);

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ href: "/", label: "Trang chủ" }, { label: "Thư viện" }]} />
      <h1 className="text-2xl font-bold text-ink">Thư viện tài liệu</h1>
      <p className="mt-1 text-muted">Chọn khối lớp, sau đó chọn môn học.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {catalog.grades.map((g) => (
          <section key={g.id} className="card p-5">
            <h2 className="text-lg font-bold">
              <Link href={`/thu-vien/${g.slug}`} className="hover:text-brand-700">
                {g.name}
              </Link>
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {idx.subjectsSorted().map((s) => {
                const n = docs.filter((d) => d.gradeId === g.id && d.subjectId === s.id).length;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/thu-vien/${g.slug}/${s.id}`}
                      className="flex items-center justify-between py-2.5 text-sm hover:text-brand-700"
                    >
                      <span>{s.name}</span>
                      <span className="text-xs text-muted">{n} tài liệu</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

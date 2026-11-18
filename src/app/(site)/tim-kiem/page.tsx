import type { Metadata } from "next";
import Link from "next/link";
import { DocumentGrid } from "@/components/document-card";
import { SearchBox } from "@/components/search-box";
import { Breadcrumbs, EmptyState } from "@/components/site-chrome";
import { catalogIndex } from "@/lib/catalog";
import { DOCUMENT_TYPE_LABEL } from "@/lib/labels";
import { getCatalog, getRepo } from "@/lib/repo";
import { searchDocuments } from "@/lib/search";
import { DOCUMENT_TYPES, type DocumentType } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tìm kiếm tài liệu" };

const PAGE_SIZE = 24;

function str(v: string | string[] | undefined): string | undefined {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, 100) : undefined;
}

export default async function SearchPage({ searchParams }: PageProps<"/tim-kiem">) {
  const sp = await searchParams;
  const [catalog, docs] = await Promise.all([getCatalog(), getRepo().listPublishedDocuments()]);
  const idx = catalogIndex(catalog);

  const q = str(sp.q) ?? "";
  const lopNum = Number(str(sp.lop));
  const grade = catalog.grades.find((g) => g.id === lopNum)?.id;
  const subject = idx.subject(str(sp.mon) ?? "")?.id;
  const typeRaw = str(sp.loai);
  const type = typeRaw && (DOCUMENT_TYPES as readonly string[]).includes(typeRaw) ? (typeRaw as DocumentType) : undefined;
  const series = idx.series(str(sp["bo-sach"]) ?? null)?.id;
  const sortParam = str(sp["sap-xep"]) === "moi-nhat" ? "moi-nhat" : "phu-hop";
  const page = Math.max(1, Math.floor(Number(str(sp.trang)) || 1));

  const hits = searchDocuments(docs, catalog, {
    q,
    grade,
    subject,
    type,
    series,
    sort: sortParam === "moi-nhat" ? "newest" : "relevant",
  });
  const pageCount = Math.max(1, Math.ceil(hits.length / PAGE_SIZE));
  const shown = hits.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((h) => h.doc);

  const qs = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const cur: Record<string, string | undefined> = {
      q: q || undefined,
      lop: grade ? String(grade) : undefined,
      mon: subject,
      loai: type,
      "bo-sach": series,
      "sap-xep": sortParam === "moi-nhat" ? "moi-nhat" : undefined,
      ...overrides,
    };
    for (const [k, v] of Object.entries(cur)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/tim-kiem?${s}` : "/tim-kiem";
  };

  return (
    <div className="container-page py-8">
      <Breadcrumbs items={[{ href: "/", label: "Trang chủ" }, { label: "Tìm kiếm" }]} />
      <h1 className="text-2xl font-bold text-ink">Tìm kiếm tài liệu</h1>
      <div className="mt-4 max-w-2xl">
        <SearchBox defaultValue={q} key={q} />
      </div>

      {/* Bộ lọc dùng form GET — hoạt động cả khi tắt JavaScript */}
      <form action="/tim-kiem" method="get" className="card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {q && <input type="hidden" name="q" value={q} />}
        <div>
          <label htmlFor="f-lop" className="label">Khối lớp</label>
          <select id="f-lop" name="lop" defaultValue={grade ?? ""} className="input">
            <option value="">Tất cả</option>
            {catalog.grades.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-mon" className="label">Môn</label>
          <select id="f-mon" name="mon" defaultValue={subject ?? ""} className="input">
            <option value="">Tất cả</option>
            {idx.subjectsSorted().map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-loai" className="label">Loại tài liệu</label>
          <select id="f-loai" name="loai" defaultValue={type ?? ""} className="input">
            <option value="">Tất cả</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-bs" className="label">Bộ sách</label>
          <select id="f-bs" name="bo-sach" defaultValue={series ?? ""} className="input">
            <option value="">Tất cả</option>
            {catalog.series.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="f-sort" className="label">Sắp xếp</label>
          <select id="f-sort" name="sap-xep" defaultValue={sortParam} className="input">
            <option value="phu-hop">Phù hợp nhất</option>
            <option value="moi-nhat">Mới nhất</option>
          </select>
        </div>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="btn-primary">Áp dụng bộ lọc</button>
          <Link href={q ? `/tim-kiem?q=${encodeURIComponent(q)}` : "/tim-kiem"} className="btn-secondary">
            Xóa lọc
          </Link>
        </div>
      </form>

      <p className="mt-6 text-sm text-muted" aria-live="polite">
        {q ? <>Tìm thấy <strong className="text-ink">{hits.length}</strong> tài liệu cho “{q}”</> : <>{hits.length} tài liệu</>}
      </p>

      <div className="mt-4">
        {shown.length ? (
          <DocumentGrid docs={shown} idx={idx} />
        ) : (
          <EmptyState title="Không tìm thấy tài liệu phù hợp">
            Thử từ khóa ngắn hơn, gõ không dấu (ví dụ “nguyen ham”) hoặc bỏ bớt bộ lọc.
          </EmptyState>
        )}
      </div>

      {pageCount > 1 && (
        <nav aria-label="Phân trang" className="mt-8 flex flex-wrap justify-center gap-2">
          {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={qs({ trang: p > 1 ? String(p) : undefined })} className={`chip ${p === page ? "chip-active" : ""}`} aria-current={p === page ? "page" : undefined}>
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";
import { searchDocuments } from "@/lib/search";

/** Gợi ý tìm kiếm khi đang gõ (F02): tối đa 6 tài liệu đã công khai. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json([]);
  const [catalog, docs] = await Promise.all([getCatalog(), getRepo().listPublishedDocuments()]);
  const idx = catalogIndex(catalog);
  const hits = searchDocuments(docs, catalog, { q }).slice(0, 6);
  return NextResponse.json(
    hits.map(({ doc }) => ({ id: doc.id, title: doc.title, meta: idx.docMeta(doc) })),
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}

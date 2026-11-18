import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { getCatalog } from "@/lib/repo";
import { DocumentForm } from "../document-form";

export default async function NewDocumentPage() {
  await requireAdmin();
  const catalog = await getCatalog();
  return (
    <div className="max-w-3xl">
      <Link href="/admin/tai-lieu" className="text-sm text-muted hover:text-ink">← Danh sách tài liệu</Link>
      <h1 className="mt-2 text-2xl font-bold text-ink">Thêm tài liệu</h1>
      <div className="card mt-5 p-5">
        <DocumentForm catalog={catalog} />
      </div>
    </div>
  );
}

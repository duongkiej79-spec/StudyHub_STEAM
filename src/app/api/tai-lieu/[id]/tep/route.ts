import { getCurrentAdmin } from "@/lib/auth";
import { getRepo } from "@/lib/repo";
import { getFile } from "@/lib/storage";
import { slugify } from "@/lib/text";
import { uuid } from "@/lib/validation";

/**
 * Phục vụ tệp PDF của một tài liệu (F05).
 *  - Khách: chỉ tài liệu đã công khai (không cần đăng nhập).
 *  - Quản trị viên: xem được cả tài liệu chưa duyệt để kiểm duyệt.
 *  - ?tai=1 → tải xuống; mặc định hiển thị trực tiếp (inline).
 * Tệp luôn trả về với Content-Type application/pdf + nosniff, nên trình duyệt không
 * coi nội dung là trang web; PDF chứa JavaScript đã bị chặn từ lúc tải lên (inspectPdf).
 */
export async function GET(request: Request, ctx: RouteContext<"/api/tai-lieu/[id]/tep">) {
  const { id } = await ctx.params;
  if (!uuid.safeParse(id).success) return new Response("Không tìm thấy", { status: 404 });

  const repo = getRepo();
  let doc = await repo.getPublishedDocument(id);
  let isAdminPreview = false;
  if (!doc) {
    if (await getCurrentAdmin()) {
      doc = await repo.getDocument(id);
      isAdminPreview = true;
    }
  }
  if (!doc?.filePath) return new Response("Không tìm thấy", { status: 404 });

  const bytes = await getFile(doc.filePath);
  if (!bytes) return new Response("Tệp không còn tồn tại", { status: 410 });

  const download = new URL(request.url).searchParams.get("tai") === "1";
  const asciiName = `${slugify(doc.title) || "tai-lieu"}.pdf`;
  const utf8Name = encodeURIComponent(`${doc.title}.pdf`);

  return new Response(new Blob([bytes as BlobPart], { type: "application/pdf" }), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${utf8Name}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isAdminPreview ? "private, no-store" : "public, max-age=300",
    },
  });
}

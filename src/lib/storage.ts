import "server-only";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { getBackend } from "./config";
import { MAX_PDF_BYTES } from "./labels";
import { createSupabaseServerClient } from "./supabase/server";

/**
 * Kho tệp PDF. Khóa tệp luôn có dạng "samples/<slug>.pdf" hoặc "uploads/<uuid>.pdf"
 * — được kiểm tra chặt để không thể truy cập ra ngoài thư mục lưu trữ.
 */
const KEY_RE = /^(samples|uploads)\/[a-z0-9-]{1,120}\.pdf$/;
const LOCAL_ROOT = path.join(process.cwd(), "storage");
const BUCKET = "documents";

export function isValidKey(key: string): boolean {
  return KEY_RE.test(key);
}

export function newUploadKey(): string {
  return `uploads/${randomUUID()}.pdf`;
}

function assertKey(key: string) {
  if (!isValidKey(key)) throw new Error("Khóa tệp không hợp lệ");
}

export async function putFile(key: string, bytes: Uint8Array): Promise<void> {
  assertKey(key);
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    const { error } = await sb.storage.from(BUCKET).upload(key, bytes, { contentType: "application/pdf", upsert: false });
    if (error) throw new Error(`Không tải tệp lên được: ${error.message}`);
    return;
  }
  const full = path.join(LOCAL_ROOT, key);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, bytes, { flag: "wx" });
}

export async function getFile(key: string): Promise<Uint8Array | null> {
  assertKey(key);
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.storage.from(BUCKET).download(key);
    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
  }
  try {
    return new Uint8Array(await fs.readFile(path.join(LOCAL_ROOT, key)));
  } catch {
    return null;
  }
}

export async function removeFile(key: string): Promise<void> {
  if (!isValidKey(key) || key.startsWith("samples/")) return; // không xóa tệp mẫu đi kèm mã nguồn
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    await sb.storage.from(BUCKET).remove([key]);
    return;
  }
  await fs.rm(path.join(LOCAL_ROOT, key), { force: true });
}

export type PdfCheck = { ok: true; pageCount: number } | { ok: false; error: string };

/**
 * Kiểm tra tệp tải lên (yêu cầu phi chức năng): đúng định dạng PDF, không vượt dung lượng,
 * đọc được cấu trúc, và không chứa JavaScript / lệnh khởi chạy chương trình.
 */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfCheck> {
  if (bytes.byteLength === 0) return { ok: false, error: "Tệp rỗng." };
  if (bytes.byteLength > MAX_PDF_BYTES) return { ok: false, error: "Tệp vượt quá 10 MB." };
  const head = new TextDecoder("latin1").decode(bytes.subarray(0, 1024));
  if (!head.includes("%PDF-")) return { ok: false, error: "Tệp không phải định dạng PDF." };
  const body = new TextDecoder("latin1").decode(bytes);
  if (/\/(JavaScript|JS|Launch|EmbeddedFile)\b/.test(body)) {
    return { ok: false, error: "PDF chứa mã thực thi hoặc tệp nhúng — không được phép đăng." };
  }
  try {
    const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
    const pageCount = pdf.getPageCount();
    if (pageCount < 1) return { ok: false, error: "PDF không có trang nào." };
    return { ok: true, pageCount };
  } catch {
    return { ok: false, error: "Không đọc được tệp PDF (tệp có thể bị hỏng)." };
  }
}

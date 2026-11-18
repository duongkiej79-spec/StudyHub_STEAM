// Sao chép worker của PDF.js vào public/ để trình xem PDF tải được từ cùng origin.
import { copyFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
try {
  // Bản "legacy" chạy được trên cả trình duyệt điện thoại đời cũ.
  const src = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  const dest = path.resolve(import.meta.dirname, "..", "public", "pdf.worker.min.mjs");
  await mkdir(path.dirname(dest), { recursive: true });
  await copyFile(src, dest);
  console.log("pdf.worker.min.mjs -> public/");
} catch (e) {
  console.warn("Không sao chép được PDF.js worker:", e.message);
}

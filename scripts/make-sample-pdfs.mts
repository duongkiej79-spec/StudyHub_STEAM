/**
 * Sinh các PDF mẫu vào storage/samples/ và manifest.json (kích thước, số trang).
 *   npm run samples:pdf
 * Cần một font TTF có dấu tiếng Việt. Mặc định dùng Arial của Windows;
 * đặt biến FONT_REGULAR / FONT_BOLD để dùng font khác (ví dụ Noto Sans).
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { buildSeedDocuments, seedCatalog, seedDocumentList, sampleFilePath } from "../src/lib/seed-data.ts";
import { SAMPLE_CONTENT, type Block } from "./sample-content.mts";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(ROOT, "storage");
const FONT_REGULAR = process.env.FONT_REGULAR ?? "C:/Windows/Fonts/arial.ttf";
const FONT_BOLD = process.env.FONT_BOLD ?? "C:/Windows/Fonts/arialbd.ttf";
const FONT_SYMBOL = process.env.FONT_SYMBOL ?? "C:/Windows/Fonts/seguisym.ttf";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 56;
const BRAND = rgb(0.11, 0.33, 0.85);
const MUTED = rgb(0.4, 0.42, 0.47);
const INK = rgb(0.1, 0.1, 0.12);

/**
 * Ghép font: ký tự nào font chính (Arial) không có thì vẽ bằng font ký hiệu
 * (Segoe UI Symbol: ⇒ ⇔ ∀ ∃ ∈ ...). Ký tự cả hai đều thiếu được báo và thay "?".
 */
type Run = { text: string; font: PDFFont };
class FontStack {
  missing = new Set<string>();
  private main: PDFFont;
  private sym: PDFFont | null;
  private mainSet: Set<number>;
  private symSet: Set<number>;
  constructor(main: PDFFont, sym: PDFFont | null) {
    this.main = main;
    this.sym = sym;
    this.mainSet = new Set(main.getCharacterSet());
    this.symSet = new Set(sym?.getCharacterSet() ?? []);
  }
  withMain(main: PDFFont) {
    return new FontStack(main, this.sym);
  }
  runs(text: string): Run[] {
    const out: Run[] = [];
    for (let ch of text) {
      const cp = ch.codePointAt(0)!;
      let font = this.main;
      if (!this.mainSet.has(cp) && ch !== " ") {
        if (this.sym && this.symSet.has(cp)) font = this.sym;
        else {
          this.missing.add(ch);
          ch = "?";
        }
      }
      const last = out[out.length - 1];
      if (last && last.font === font) last.text += ch;
      else out.push({ text: ch, font });
    }
    return out;
  }
  width(text: string, size: number) {
    return this.runs(text).reduce((w, r) => w + r.font.widthOfTextAtSize(r.text, size), 0);
  }
  draw(page: PDFPage, text: string, x: number, y: number, size: number, color: ReturnType<typeof rgb>) {
    for (const r of this.runs(text)) {
      page.drawText(r.text, { x, y, size, font: r.font, color });
      x += r.font.widthOfTextAtSize(r.text, size);
    }
  }
}

function wrap(text: string, fs: FontStack, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (fs.width(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function render(key: string, blocks: Block[], regBytes: Uint8Array, boldBytes: Uint8Array, symBytes: Uint8Array | null) {
  const seed = seedDocumentList.find((d) => d.key === key)!;
  const doc = buildSeedDocuments().find((d) => d.filePath === sampleFilePath(key))!;
  const grade = seedCatalog.grades.find((g) => g.id === doc.gradeId)!;
  const subject = seedCatalog.subjects.find((s) => s.id === doc.subjectId)!;

  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(seed.title);
  pdf.setAuthor(doc.source);
  pdf.setSubject(`${subject.name} – ${grade.name}`);
  pdf.setCreator("StudyHub");
  const sym = symBytes ? await pdf.embedFont(symBytes, { subset: true }) : null;
  const reg = new FontStack(await pdf.embedFont(regBytes, { subset: true }), sym);
  const bold = reg.withMain(await pdf.embedFont(boldBytes, { subset: true }));

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const width = PAGE_W - MARGIN * 2;

  const newPage = () => {
    page = pdf.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensure = (h: number) => {
    if (y - h < MARGIN + 30) newPage();
  };
  const text = (t: string, opts: { font: FontStack; size: number; x?: number; color?: ReturnType<typeof rgb>; gap?: number }) => {
    const x = opts.x ?? MARGIN;
    const lineH = opts.size * 1.45;
    for (const line of wrap(t, opts.font, opts.size, width - (x - MARGIN))) {
      ensure(lineH);
      opts.font.draw(page, line, x, y - opts.size, opts.size, opts.color ?? INK);
      y -= lineH;
    }
    y -= opts.gap ?? 0;
  };

  // Tiêu đề
  text(`STUDYHUB  •  ${grade.name.toUpperCase()}  •  ${subject.name.toUpperCase()}`, { font: bold, size: 9, color: BRAND, gap: 6 });
  text(seed.title, { font: bold, size: 20, gap: 4 });
  text(seed.description, { font: reg, size: 10.5, color: MUTED, gap: 10 });
  page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y }, thickness: 1, color: rgb(0.85, 0.87, 0.9) });
  y -= 16;

  for (const b of blocks) {
    if ("h" in b) {
      ensure(40);
      y -= 4;
      text(b.h, { font: bold, size: 13, color: BRAND, gap: 4 });
    } else if ("p" in b) {
      text(b.p, { font: reg, size: 11, gap: 6 });
    } else if ("li" in b) {
      ensure(16);
      page.drawCircle({ x: MARGIN + 6, y: y - 7.5, size: 1.8, color: INK });
      text(b.li, { font: reg, size: 11, x: MARGIN + 16, gap: 3 });
    } else {
      const lines = wrap(b.f, reg, 11, width - 40);
      const h = lines.length * 16 + 8;
      ensure(h);
      page.drawRectangle({ x: MARGIN + 8, y: y - h + 2, width: width - 8, height: h, color: rgb(0.95, 0.97, 1) });
      y -= 4;
      text(b.f, { font: reg, size: 11, x: MARGIN + 20, gap: 8 });
    }
  }

  // Chân trang
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    reg.draw(p, `Nguồn: ${doc.source} • ${doc.licenseNote}`, MARGIN, 30, 8, MUTED);
    const num = `${i + 1}/${pages.length}`;
    reg.draw(p, num, PAGE_W - MARGIN - reg.width(num, 8), 30, 8, MUTED);
  });

  const missing = new Set([...reg.missing, ...bold.missing]);
  if (missing.size) console.warn(`  ! ${key}: không font nào có ký tự ${[...missing].join(" ")} — đã thay bằng "?"`);
  const bytes = await pdf.save();
  return { bytes, pages: pages.length };
}

async function main() {
  const [regBytes, boldBytes] = await Promise.all([readFile(FONT_REGULAR), readFile(FONT_BOLD)]);
  const symBytes = await readFile(FONT_SYMBOL).catch(() => {
    console.warn(`  ! Không đọc được font ký hiệu ${FONT_SYMBOL}; các ký hiệu toán sẽ bị thay bằng "?"`);
    return null;
  });
  await mkdir(path.join(OUT_DIR, "samples"), { recursive: true });
  const manifest: Record<string, { size: number; pages: number }> = {};
  for (const d of seedDocumentList.filter((x) => x.hasFile)) {
    const blocks = SAMPLE_CONTENT[d.key];
    if (!blocks) throw new Error(`Thiếu nội dung cho ${d.key}`);
    const { bytes, pages } = await render(d.key, blocks, regBytes, boldBytes, symBytes);
    const rel = sampleFilePath(d.key);
    await writeFile(path.join(OUT_DIR, rel), bytes);
    manifest[rel] = { size: bytes.byteLength, pages };
    console.log(`  ✓ ${rel} (${pages} trang, ${(bytes.byteLength / 1024).toFixed(0)} KB)`);
  }
  await writeFile(path.join(OUT_DIR, "samples", "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Đã tạo ${Object.keys(manifest).length} PDF mẫu.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

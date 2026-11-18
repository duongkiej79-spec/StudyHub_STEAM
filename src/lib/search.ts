// Đuôi .ts tường minh để file chạy được cả trong Next lẫn `node --test` (tests/).
import { normalizeVi, tokenize } from "./text.ts";
import type { Catalog, DocumentType, StudyDocument } from "./types";

export type SortMode = "relevant" | "newest";

export interface SearchFilters {
  q?: string;
  grade?: number;
  subject?: string;
  type?: DocumentType;
  series?: string;
  sort?: SortMode;
}

export interface SearchHit {
  doc: StudyDocument;
  score: number;
}

type Field = { words: string[]; text: string; weight: number };

function field(text: string, weight: number): Field {
  const n = normalizeVi(text);
  return { words: n ? n.split(" ") : [], text: n, weight };
}

/**
 * Tìm kiếm tài liệu (F02 + F03): không phân biệt dấu, khớp tiền tố từ,
 * yêu cầu MỌI từ khóa đều xuất hiện ở ít nhất một trường.
 * Chạy trong bộ nhớ — đủ nhanh cho vài nghìn tài liệu của bản MVP.
 */
export function searchDocuments(docs: StudyDocument[], catalog: Catalog, filters: SearchFilters): SearchHit[] {
  const tokens = tokenize(filters.q ?? "");
  const phrase = tokens.join(" ");
  const subjectName = new Map(catalog.subjects.map((s) => [s.id, s.name]));
  const gradeName = new Map(catalog.grades.map((g) => [g.id, g.name]));
  const chapterTitle = new Map(catalog.chapters.map((c) => [c.id, c.title]));
  const lessonTitle = new Map(catalog.lessons.map((l) => [l.id, l.title]));

  const hits: SearchHit[] = [];
  for (const doc of docs) {
    if (filters.grade && doc.gradeId !== filters.grade) continue;
    if (filters.subject && doc.subjectId !== filters.subject) continue;
    if (filters.type && doc.type !== filters.type) continue;
    if (filters.series && doc.seriesId !== filters.series) continue;

    let score = 0;
    if (tokens.length) {
      const fields = [
        field(doc.title, 5),
        field(doc.lessonId ? (lessonTitle.get(doc.lessonId) ?? "") : "", 3),
        field(doc.chapterId ? (chapterTitle.get(doc.chapterId) ?? "") : "", 2),
        field(`${subjectName.get(doc.subjectId) ?? ""} ${gradeName.get(doc.gradeId) ?? ""}`, 2),
        field(doc.description, 1),
      ];
      let allMatched = true;
      for (const t of tokens) {
        let best = 0;
        for (const f of fields) {
          for (const w of f.words) {
            if (w === t) best = Math.max(best, f.weight * 2);
            else if (w.startsWith(t)) best = Math.max(best, f.weight);
          }
        }
        if (best === 0) {
          allMatched = false;
          break;
        }
        score += best;
      }
      if (!allMatched) continue;
      if (tokens.length > 1 && fields[0].text.includes(phrase)) score += 15;
    }
    hits.push({ doc, score });
  }

  const byDate = (a: SearchHit, b: SearchHit) =>
    (b.doc.publishedAt ?? b.doc.updatedAt).localeCompare(a.doc.publishedAt ?? a.doc.updatedAt);
  if (filters.sort === "newest" || !tokens.length) hits.sort(byDate);
  else hits.sort((a, b) => b.score - a.score || byDate(a, b));
  return hits;
}

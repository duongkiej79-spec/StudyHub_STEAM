import type { Catalog, Chapter, Grade, Lesson, StudyDocument, Subject } from "./types";

/** Tra cứu tiện dụng trên danh mục (thuần, dùng được ở mọi nơi). */
export function catalogIndex(c: Catalog) {
  const grades = new Map(c.grades.map((g) => [g.id, g]));
  const subjects = new Map(c.subjects.map((s) => [s.id, s]));
  const series = new Map(c.series.map((s) => [s.id, s]));
  const chapters = new Map(c.chapters.map((x) => [x.id, x]));
  const lessons = new Map(c.lessons.map((x) => [x.id, x]));
  return {
    grade: (id: number) => grades.get(id as Grade["id"]),
    gradeBySlug: (slug: string) => c.grades.find((g) => g.slug === slug),
    subject: (id: string) => subjects.get(id),
    series: (id: string | null) => (id ? series.get(id) : undefined),
    chapter: (id: string | null) => (id ? chapters.get(id) : undefined),
    lesson: (id: string | null) => (id ? lessons.get(id) : undefined),
    chaptersOf: (gradeId: number, subjectId: string): Chapter[] =>
      c.chapters.filter((x) => x.gradeId === gradeId && x.subjectId === subjectId).sort((a, b) => a.order - b.order),
    lessonsOf: (chapterId: string): Lesson[] =>
      c.lessons.filter((l) => l.chapterId === chapterId).sort((a, b) => a.order - b.order),
    subjectsSorted: (): Subject[] => [...c.subjects].sort((a, b) => a.order - b.order),
    /** "Toán · Lớp 12" */
    docMeta: (d: Pick<StudyDocument, "subjectId" | "gradeId">) =>
      `${subjects.get(d.subjectId)?.name ?? d.subjectId} · ${grades.get(d.gradeId)?.name ?? d.gradeId}`,
  };
}

export type CatalogIndex = ReturnType<typeof catalogIndex>;

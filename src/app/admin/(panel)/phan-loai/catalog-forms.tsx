"use client";

import { useActionState, useState } from "react";
import { createChapterAction, createLessonAction, type FormState } from "@/app/admin/actions";
import { submitWithoutReset } from "@/components/submit-without-reset";
import type { Catalog } from "@/lib/types";

function Flash({ state }: { state: FormState }) {
  const first = state.message ?? Object.values(state.errors ?? {})[0];
  if (!first) return null;
  return <p className={`text-sm ${state.ok ? "text-emerald-700" : "text-rose-700"}`} role={state.ok ? "status" : "alert"}>{first}</p>;
}

export function ChapterForm({ catalog }: { catalog: Catalog }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createChapterAction, {});
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-3" key={state.seq}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="c-grade" className="label">Khối</label>
          <select id="c-grade" name="gradeId" className="input">
            {catalog.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="c-subject" className="label">Môn</label>
          <select id="c-subject" name="subjectId" className="input">
            {[...catalog.subjects].sort((a, b) => a.order - b.order).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="c-series" className="label">Bộ sách</label>
        <select id="c-series" name="seriesId" className="input">
          <option value="">— Không phân biệt —</option>
          {catalog.series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="c-title" className="label">Tên chương</label>
        <input id="c-title" name="title" required minLength={2} className="input" />
      </div>
      <Flash state={state} />
      <button type="submit" disabled={pending} className="btn-primary py-2">Thêm chương</button>
    </form>
  );
}

export function LessonForm({ catalog }: { catalog: Catalog }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createLessonAction, {});
  const [grade, setGrade] = useState<number>(10);
  const [subject, setSubject] = useState(catalog.subjects[0]?.id ?? "");
  const chapters = catalog.chapters.filter((c) => c.gradeId === grade && c.subjectId === subject);
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-3" key={state.seq}>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="l-grade" className="label">Khối</label>
          <select id="l-grade" value={grade} onChange={(e) => setGrade(Number(e.target.value))} className="input">
            {catalog.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="l-subject" className="label">Môn</label>
          <select id="l-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className="input">
            {[...catalog.subjects].sort((a, b) => a.order - b.order).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="l-chapter" className="label">Chương</label>
        <select id="l-chapter" name="chapterId" required className="input">
          {chapters.length === 0 && <option value="">— Chưa có chương —</option>}
          {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="l-title" className="label">Tên bài</label>
        <input id="l-title" name="title" required minLength={2} className="input" />
      </div>
      <Flash state={state} />
      <button type="submit" disabled={pending || chapters.length === 0} className="btn-primary py-2">Thêm bài</button>
    </form>
  );
}

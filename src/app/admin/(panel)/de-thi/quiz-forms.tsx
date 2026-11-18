"use client";

import { useActionState, useState } from "react";
import { saveQuestionAction, saveQuizAction, type FormState } from "@/app/admin/actions";
import { submitWithoutReset } from "@/components/submit-without-reset";
import type { Catalog, Question, Quiz } from "@/lib/types";

const LETTERS = ["A", "B", "C", "D"];

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-sm text-rose-700">{msg}</p> : null;
}

function Flash({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}

/** Tạo mới / sửa thông tin đề. */
export function QuizForm({ catalog, quiz }: { catalog: Catalog; quiz?: Quiz }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuizAction, {});
  const [gradeId, setGradeId] = useState<number>(quiz?.gradeId ?? 10);
  const [subjectId, setSubjectId] = useState(quiz?.subjectId ?? catalog.subjects[0]?.id ?? "");
  const e = state.errors ?? {};
  const chapters = catalog.chapters.filter((c) => c.gradeId === gradeId && c.subjectId === subjectId);

  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-4">
      {quiz && <input type="hidden" name="id" value={quiz.id} />}
      <div>
        <label htmlFor="q-title" className="label">Tên đề *</label>
        <input id="q-title" name="title" defaultValue={quiz?.title} required minLength={3} className="input" />
        <Err msg={e.title} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label htmlFor="q-grade" className="label">Khối *</label>
          <select id="q-grade" name="gradeId" value={gradeId} onChange={(ev) => setGradeId(Number(ev.target.value))} className="input">
            {catalog.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="q-subject" className="label">Môn *</label>
          <select id="q-subject" name="subjectId" value={subjectId} onChange={(ev) => setSubjectId(ev.target.value)} className="input">
            {[...catalog.subjects].sort((a, b) => a.order - b.order).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Err msg={e.subjectId} />
        </div>
        <div>
          <label htmlFor="q-chapter" className="label">Chủ đề / Chương</label>
          <select id="q-chapter" name="chapterId" key={`${gradeId}-${subjectId}`} defaultValue={quiz?.chapterId ?? ""} className="input">
            <option value="">— Không gắn —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <Err msg={e.chapterId} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <label htmlFor="q-desc" className="label">Mô tả</label>
          <input id="q-desc" name="description" defaultValue={quiz?.description} className="input" />
        </div>
        <div>
          <label htmlFor="q-dur" className="label">Thời gian (phút)</label>
          <input id="q-dur" name="durationMinutes" type="number" min={1} max={180} defaultValue={quiz?.durationMinutes ?? ""} className="input" placeholder="Không giới hạn" />
          <Err msg={e.durationMinutes} />
        </div>
      </div>
      {quiz && (
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isPublished" defaultChecked={quiz.isPublished} className="accent-brand-600" />
            Xuất bản (học sinh nhìn thấy và làm được đề này)
          </label>
          <Err msg={e.isPublished} />
        </div>
      )}
      <Flash state={state} />
      <button type="submit" disabled={pending} className="btn-primary">{pending ? "Đang lưu…" : quiz ? "Lưu thông tin đề" : "Tạo đề"}</button>
    </form>
  );
}

/** Thêm / sửa một câu hỏi: 4 phương án, đúng 1 đáp án đúng, lời giải. */
export function QuestionForm({ quizId, question, nextOrder }: { quizId: string; question?: Question; nextOrder: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveQuestionAction, {});
  const e = state.errors ?? {};
  const correctIdx = question ? question.options.findIndex((o) => o.isCorrect) : -1;
  // Sau khi thêm câu mới thành công, server trả `seq` mới → đổi key để form trống lại.
  const formKey = !question && state.seq ? `new-${state.seq}` : undefined;

  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-3" key={formKey}>
      <input type="hidden" name="quizId" value={quizId} />
      {question && <input type="hidden" name="questionId" value={question.id} />}
      <input type="hidden" name="order" value={question?.order ?? nextOrder} />
      <div>
        <label className="label" htmlFor={`text-${question?.id ?? "new"}`}>Nội dung câu hỏi *</label>
        <textarea id={`text-${question?.id ?? "new"}`} name="text" rows={2} defaultValue={question?.text} required className="input" />
        <Err msg={e.text} />
      </div>
      <fieldset>
        <legend className="label">Phương án (chọn đáp án đúng) *</legend>
        <div className="space-y-2">
          {LETTERS.map((L, i) => (
            <div key={L} className="flex items-center gap-2">
              <input
                type="radio"
                name="correct"
                value={i}
                defaultChecked={i === correctIdx}
                aria-label={`Phương án ${L} là đáp án đúng`}
                className="size-4 accent-emerald-600"
              />
              <span className="w-5 font-semibold">{L}.</span>
              <input name={`option_${i}`} defaultValue={question?.options[i]?.text} required className="input py-2" aria-label={`Phương án ${L}`} />
            </div>
          ))}
        </div>
        <Err msg={e.options ?? e.correct} />
      </fieldset>
      <div>
        <label className="label" htmlFor={`exp-${question?.id ?? "new"}`}>Lời giải / giải thích</label>
        <textarea id={`exp-${question?.id ?? "new"}`} name="explanation" rows={2} defaultValue={question?.explanation} className="input" />
      </div>
      <Flash state={state} />
      <button type="submit" disabled={pending} className="btn-primary py-2">{pending ? "Đang lưu…" : question ? "Lưu câu hỏi" : "Thêm câu hỏi"}</button>
    </form>
  );
}

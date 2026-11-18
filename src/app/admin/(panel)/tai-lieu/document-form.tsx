"use client";

import { useActionState, useState } from "react";
import { saveDocumentAction, type FormState } from "@/app/admin/actions";
import { submitWithoutReset } from "@/components/submit-without-reset";
import { DOCUMENT_TYPE_LABEL, formatBytes, MAX_PDF_BYTES } from "@/lib/labels";
import { DOCUMENT_TYPES, type Catalog, type StudyDocument } from "@/lib/types";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-sm text-rose-700">{msg}</p> : null;
}

/**
 * Form thêm/sửa tài liệu (F08) theo bảng "trường cần nhập" ở mục 7 đặc tả.
 * Danh sách Chương lọc theo Khối + Môn, danh sách Bài lọc theo Chương.
 */
export function DocumentForm({ catalog, doc }: { catalog: Catalog; doc?: StudyDocument }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDocumentAction, {});
  const [gradeId, setGradeId] = useState<number>(doc?.gradeId ?? 10);
  const [subjectId, setSubjectId] = useState(doc?.subjectId ?? catalog.subjects[0]?.id ?? "");
  const [chapterId, setChapterId] = useState(doc?.chapterId ?? "");
  const [fileNote, setFileNote] = useState<string | null>(null);
  const e = state.errors ?? {};

  const chapters = catalog.chapters.filter((c) => c.gradeId === gradeId && c.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const lessons = catalog.lessons.filter((l) => l.chapterId === chapterId).sort((a, b) => a.order - b.order);
  const subjects = [...catalog.subjects].sort((a, b) => a.order - b.order);

  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-5">
      {doc && <input type="hidden" name="id" value={doc.id} />}

      <div>
        <label htmlFor="title" className="label">Tên tài liệu *</label>
        <input id="title" name="title" defaultValue={doc?.title} required minLength={3} maxLength={200} className="input" placeholder="Công thức nguyên hàm cơ bản – Toán 12" />
        <Err msg={e.title} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="gradeId" className="label">Khối *</label>
          <select id="gradeId" name="gradeId" value={gradeId} onChange={(ev) => { setGradeId(Number(ev.target.value)); setChapterId(""); }} className="input">
            {catalog.grades.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="subjectId" className="label">Môn *</label>
          <select id="subjectId" name="subjectId" value={subjectId} onChange={(ev) => { setSubjectId(ev.target.value); setChapterId(""); }} className="input">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Err msg={e.subjectId} />
        </div>
        <div>
          <label htmlFor="seriesId" className="label">Bộ sách (nếu áp dụng)</label>
          <select id="seriesId" name="seriesId" defaultValue={doc?.seriesId ?? ""} className="input">
            <option value="">— Không phân biệt bộ sách —</option>
            {catalog.series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="label">Loại học liệu *</label>
          <select id="type" name="type" defaultValue={doc?.type ?? "ly_thuyet"} className="input">
            {DOCUMENT_TYPES.map((t) => <option key={t} value={t}>{DOCUMENT_TYPE_LABEL[t]}</option>)}
          </select>
          <Err msg={e.type} />
        </div>
        <div>
          <label htmlFor="chapterId" className="label">Chương</label>
          <select id="chapterId" name="chapterId" value={chapterId} onChange={(ev) => setChapterId(ev.target.value)} className="input">
            <option value="">— Chưa gắn chương —</option>
            {chapters.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          {chapters.length === 0 && <p className="mt-1 text-xs text-muted">Chưa có chương cho khối/môn này — thêm ở mục Phân loại.</p>}
          <Err msg={e.chapterId} />
        </div>
        <div>
          <label htmlFor="lessonId" className="label">Bài</label>
          <select id="lessonId" name="lessonId" key={chapterId} defaultValue={doc?.chapterId === chapterId ? (doc?.lessonId ?? "") : ""} className="input" disabled={!chapterId}>
            <option value="">— Chưa gắn bài —</option>
            {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
          <Err msg={e.lessonId} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">Mô tả ngắn</label>
        <textarea id="description" name="description" defaultValue={doc?.description} rows={3} maxLength={2000} className="input" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="source" className="label">Nguồn (tác giả / đơn vị / đường dẫn) *</label>
          <input id="source" name="source" defaultValue={doc?.source} required className="input" placeholder="Tổ Toán – THPT ABC" />
          <Err msg={e.source} />
        </div>
        <div>
          <label htmlFor="licenseNote" className="label">Quyền chia sẻ *</label>
          <input id="licenseNote" name="licenseNote" defaultValue={doc?.licenseNote} required className="input" placeholder="Tự biên soạn / CC BY 4.0 / Được tác giả đồng ý" />
          <Err msg={e.licenseNote} />
        </div>
      </div>

      <div>
        <label htmlFor="file" className="label">Tệp PDF {doc ? "(để trống nếu giữ tệp cũ)" : ""}</label>
        <input
          id="file"
          name="file"
          type="file"
          accept="application/pdf,.pdf"
          className="input file:mr-3 file:rounded file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-brand-700"
          onChange={(ev) => {
            const f = ev.target.files?.[0];
            if (!f) return setFileNote(null);
            setFileNote(f.size > MAX_PDF_BYTES ? `Tệp ${formatBytes(f.size)} vượt quá 10 MB.` : `${f.name} · ${formatBytes(f.size)}`);
          }}
        />
        <p className="mt-1 text-xs text-muted">
          Chỉ PDF, tối đa 10 MB. Tệp chứa JavaScript hoặc tệp nhúng sẽ bị từ chối.
          {doc?.filePath && ` Tệp hiện tại: ${formatBytes(doc.fileSize)}, ${doc.pageCount ?? "?"} trang.`}
        </p>
        {fileNote && <p className="mt-1 text-sm text-ink">{fileNote}</p>}
        <Err msg={e.file} />
      </div>

      {!doc && (
        <div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="rightsConfirmed" className="mt-0.5 accent-brand-600" />
            <span>Tôi xác nhận tài liệu là tự biên soạn, có giấy phép hoặc đã được chủ sở hữu đồng ý chia sẻ, và nguồn đã ghi rõ.</span>
          </label>
          <Err msg={e.rightsConfirmed} />
        </div>
      )}

      {state.message && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{state.message}</p>}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        {doc ? (
          <button type="submit" disabled={pending} className="btn-primary">{pending ? "Đang lưu…" : "Lưu thay đổi"}</button>
        ) : (
          <>
            <button type="submit" name="intent" value="draft" disabled={pending} className="btn-secondary">Lưu nháp</button>
            <button type="submit" name="intent" value="pending" disabled={pending} className="btn-secondary">Gửi duyệt</button>
            <button type="submit" name="intent" value="published" disabled={pending} className="btn-primary">{pending ? "Đang lưu…" : "Lưu & công khai"}</button>
          </>
        )}
      </div>
    </form>
  );
}

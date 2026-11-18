"use client";

import { useActionState, useState } from "react";
import { submitReport, type ReportState } from "@/app/(site)/actions";
import type { ReportTarget } from "@/lib/types";
import { submitWithoutReset } from "./submit-without-reset";

/** Form "Báo tài liệu lỗi / sai" (F12). Mở gọn để không chiếm chỗ trang tài liệu. */
export function ReportForm({ targetType, targetId, label = "Báo lỗi tài liệu" }: { targetType: ReportTarget; targetId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(submitReport, { status: "idle" });

  if (state.status === "ok") {
    return <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800" role="status">{state.message}</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm font-medium text-muted underline-offset-2 hover:text-ink hover:underline">
        {label}
      </button>
    );
  }
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="card space-y-3 p-4">
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <div className="hidden" aria-hidden>
        <label>
          Website <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div>
        <label htmlFor={`report-${targetId}`} className="label">
          Mô tả lỗi (tệp hỏng, sai nội dung, sai đáp án…)
        </label>
        <textarea id={`report-${targetId}`} name="message" rows={3} required minLength={5} maxLength={1000} className="input" />
        {state.errors?.message && <p className="mt-1 text-sm text-rose-700">{state.errors.message}</p>}
      </div>
      {state.message && <p className="text-sm text-rose-700">{state.message}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Đang gửi…" : "Gửi báo lỗi"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Hủy
        </button>
      </div>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { submitQuiz } from "@/app/(site)/actions";
import type { PublicQuiz } from "@/lib/repo/types";
import type { QuizResult } from "@/lib/types";
import { ReportForm } from "./report-form";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

function storageKey(id: string) {
  return `studyhub:quiz:${id}`;
}

/**
 * Làm bài trắc nghiệm (F07, mục 6 đặc tả): hiện số câu, tiến độ, nút chuyển câu,
 * xác nhận trước khi nộp; sau khi nộp hiện điểm, đúng/sai và lời giải từng câu.
 * Bài đang làm dở được giữ trong sessionStorage của tab (mất khi đóng tab).
 */
export function QuizPlayer({ quiz, loggedIn }: { quiz: PublicQuiz; loggedIn: boolean }) {
  const total = quiz.questions.length;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [secondsLeft, setSecondsLeft] = useState<number | null>(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
  const topRef = useRef<HTMLDivElement>(null);

  // Khôi phục bài làm dở
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(storageKey(quiz.id));
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- đồng bộ từ sessionStorage một lần khi mở trang
        setAnswers(JSON.parse(raw));
      }
    } catch {
      /* sessionStorage có thể bị chặn */
    }
  }, [quiz.id]);

  const persist = (next: Record<string, string>) => {
    try {
      sessionStorage.setItem(storageKey(quiz.id), JSON.stringify(next));
    } catch {
      /* bỏ qua */
    }
  };

  const doSubmit = useCallback(() => {
    setConfirming(false);
    setError(null);
    startTransition(async () => {
      const res = await submitQuiz(quiz.id, answers);
      if (res.ok) {
        setResult(res.result);
        try {
          sessionStorage.removeItem(storageKey(quiz.id));
        } catch {
          /* bỏ qua */
        }
        topRef.current?.scrollIntoView({ behavior: "smooth" });
      } else setError(res.error);
    });
  }, [answers, quiz.id]);

  // Đồng hồ đếm ngược; hết giờ thì tự nộp (gọi trong callback của timer, không trong thân effect).
  const submitRef = useRef(doSubmit);
  useEffect(() => {
    submitRef.current = doSubmit;
  }, [doSubmit]);
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0 || result) return;
    const t = setTimeout(() => {
      setSecondsLeft(secondsLeft - 1);
      if (secondsLeft - 1 <= 0) submitRef.current();
    }, 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, result]);

  function choose(questionId: string, optionId: string) {
    const next = { ...answers, [questionId]: optionId };
    setAnswers(next);
    persist(next);
  }

  function restart() {
    setResult(null);
    setAnswers({});
    setCurrent(0);
    setSecondsLeft(quiz.durationMinutes ? quiz.durationMinutes * 60 : null);
    persist({});
  }

  if (result) {
    return (
      <ResultView
        ref={topRef}
        result={result}
        onRestart={restart}
        note={
          loggedIn ? (
            <>Kết quả đã được lưu vào <Link href="/tai-khoan" className="font-medium text-brand-700 hover:underline">lịch sử luyện tập</Link> của bạn.</>
          ) : (
            <><Link href={`/dang-nhap?next=${encodeURIComponent(`/luyen-tap/${quiz.id}`)}`} className="font-medium text-brand-700 hover:underline">Đăng nhập</Link> để lưu lịch sử và theo dõi tiến độ.</>
          )
        }
      />
    );
  }

  const q = quiz.questions[current];
  const answered = Object.keys(answers).filter((k) => quiz.questions.some((x) => x.id === k)).length;
  const unanswered = total - answered;

  return (
    <div ref={topRef} className="space-y-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="min-w-48 flex-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-ink">
              Câu {current + 1}/{total}
            </span>
            <span className="text-muted">Đã làm {answered}/{total}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} aria-label="Tiến độ làm bài">
            <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(answered / total) * 100}%` }} />
          </div>
        </div>
        {secondsLeft !== null && (
          <div className={`rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums ${secondsLeft < 60 ? "bg-rose-50 text-rose-700" : "bg-surface text-ink"}`} aria-label="Thời gian còn lại">
            ⏱ {String(Math.floor(secondsLeft / 60)).padStart(2, "0")}:{String(secondsLeft % 60).padStart(2, "0")}
          </div>
        )}
      </div>

      <fieldset className="card p-5">
        <legend className="sr-only">Câu {current + 1}</legend>
        <p className="text-lg font-medium leading-relaxed text-ink">
          <span className="mr-2 font-bold text-brand-700">Câu {current + 1}.</span>
          {q.text}
        </p>
        <div className="mt-4 space-y-2">
          {q.options.map((o, i) => {
            const checked = answers[q.id] === o.id;
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? "border-brand-600 bg-brand-50" : "border-line hover:bg-surface"}`}
              >
                <input type="radio" name={`q-${q.id}`} value={o.id} checked={checked} onChange={() => choose(q.id, o.id)} className="mt-1 accent-brand-600" />
                <span>
                  <span className="mr-1 font-semibold">{LETTERS[i]}.</span>
                  {o.text}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn-secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
          ← Câu trước
        </button>
        {current < total - 1 ? (
          <button type="button" className="btn-secondary" onClick={() => setCurrent((c) => c + 1)}>
            Câu sau →
          </button>
        ) : (
          <button type="button" className="btn-primary" onClick={() => setConfirming(true)} disabled={pending}>
            Nộp bài
          </button>
        )}
      </div>

      <nav aria-label="Chọn câu hỏi" className="card p-4">
        <div className="mb-2 text-sm text-muted">Chuyển nhanh đến câu:</div>
        <div className="flex flex-wrap gap-2">
          {quiz.questions.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-current={i === current ? "step" : undefined}
              aria-label={`Câu ${i + 1}${answers[x.id] ? " (đã làm)" : ""}`}
              className={`size-10 rounded-lg border text-sm font-semibold ${i === current ? "border-brand-600 ring-2 ring-brand-100" : "border-line"} ${answers[x.id] ? "bg-brand-600 text-white" : "bg-white text-ink"}`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button type="button" className="btn-primary mt-4 w-full sm:w-auto" onClick={() => setConfirming(true)} disabled={pending}>
          {pending ? "Đang chấm bài…" : "Nộp bài"}
        </button>
      </nav>

      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">{error}</p>}

      {confirming && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="card w-full max-w-sm p-5 shadow-xl">
            <h2 id="confirm-title" className="text-lg font-semibold text-ink">Nộp bài?</h2>
            <p className="mt-2 text-sm text-muted">
              {unanswered > 0 ? `Bạn còn ${unanswered} câu chưa trả lời. Câu bỏ trống được tính 0 điểm.` : "Bạn đã trả lời tất cả các câu."}
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirming(false)} autoFocus>
                Làm tiếp
              </button>
              <button type="button" className="btn-primary" onClick={doSubmit}>
                Nộp bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Hiển thị điểm + đáp án/lời giải. Dùng cả khi vừa nộp bài và khi xem lại lịch sử. */
export function ResultView({
  result,
  onRestart,
  ref,
  note,
  retryHref,
}: {
  result: QuizResult;
  onRestart?: () => void;
  ref?: React.Ref<HTMLDivElement>;
  note?: React.ReactNode;
  retryHref?: string;
}) {
  const pct = result.total ? result.correctCount / result.total : 0;
  const tone = pct >= 0.8 ? "text-emerald-700" : pct >= 0.5 ? "text-amber-700" : "text-rose-700";
  return (
    <div ref={ref} className="space-y-4">
      <section className="card p-6 text-center" aria-live="polite">
        <p className="text-sm font-medium uppercase tracking-wide text-muted">Kết quả</p>
        <p className={`mt-1 text-5xl font-bold tabular-nums ${tone}`}>{result.score.toLocaleString("vi-VN")}</p>
        <p className="text-sm text-muted">điểm / thang 10</p>
        <p className="mt-3 text-ink">
          Đúng <strong>{result.correctCount}</strong> · Sai/bỏ trống <strong>{result.total - result.correctCount}</strong> trên tổng {result.total} câu
        </p>
        {note && <p className="mt-3 text-sm text-muted">{note}</p>}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {onRestart && <button type="button" className="btn-primary" onClick={onRestart}>Làm lại</button>}
          {retryHref && <Link href={retryHref} className="btn-primary">Làm lại đề này</Link>}
          <Link href="/luyen-tap" className="btn-secondary">Chọn đề khác</Link>
        </div>
      </section>

      <h2 className="pt-2 text-lg font-bold text-ink">Đáp án và lời giải</h2>
      {result.questions.map((q, i) => (
        <article key={q.questionId} className={`card border-l-4 p-5 ${q.isCorrect ? "border-l-emerald-500" : "border-l-rose-500"}`}>
          <p className="font-medium text-ink">
            <span className="mr-2 font-bold">Câu {i + 1}.</span>
            {q.text}
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {q.options.map((o, oi) => {
              const isCorrect = o.id === q.correctOptionId;
              const isPicked = o.id === q.selectedOptionId;
              return (
                <li
                  key={o.id}
                  className={`rounded-lg border px-3 py-2 ${isCorrect ? "border-emerald-300 bg-emerald-50" : isPicked ? "border-rose-300 bg-rose-50" : "border-line"}`}
                >
                  <span className="mr-1 font-semibold">{LETTERS[oi]}.</span>
                  {o.text}
                  {isCorrect && <span className="ml-2 font-medium text-emerald-700">✓ Đáp án đúng</span>}
                  {isPicked && !isCorrect && <span className="ml-2 font-medium text-rose-700">✗ Bạn chọn</span>}
                </li>
              );
            })}
          </ul>
          {!q.selectedOptionId && <p className="mt-2 text-sm text-amber-700">Bạn chưa trả lời câu này.</p>}
          {q.explanation && (
            <div className="mt-3 rounded-lg bg-surface p-3 text-sm text-ink">
              <span className="font-semibold">Giải thích: </span>
              {q.explanation}
            </div>
          )}
          <div className="mt-3">
            <ReportForm targetType="question" targetId={q.questionId} label="Báo sai đáp án" />
          </div>
        </article>
      ))}
    </div>
  );
}

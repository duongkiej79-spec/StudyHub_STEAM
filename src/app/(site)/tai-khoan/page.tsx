import type { Metadata } from "next";
import Link from "next/link";
import { DocumentGrid } from "@/components/document-card";
import { EmptyState } from "@/components/site-chrome";
import { requireUser } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { formatDate } from "@/lib/labels";
import { summarizeProgress } from "@/lib/progress";
import { getCatalog, getRepo } from "@/lib/repo";
import { logoutAction } from "../account-actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tài khoản của tôi", robots: { index: false } };

const fmtScore = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
const tone = (score: number) => (score >= 8 ? "text-emerald-700" : score >= 5 ? "text-amber-700" : "text-rose-700");

export default async function AccountPage() {
  const user = await requireUser("/tai-khoan");
  const repo = getRepo();
  const [catalog, favorites, attempts] = await Promise.all([getCatalog(), repo.listFavorites(user.id), repo.listAttempts(user.id)]);
  const idx = catalogIndex(catalog);
  const progress = summarizeProgress(attempts);

  const stats = [
    { label: "Lượt luyện tập", value: String(progress.totalAttempts) },
    { label: "Số đề đã làm", value: String(progress.quizzesDone) },
    { label: "Điểm trung bình", value: progress.totalAttempts ? fmtScore(progress.averageScore) : "—" },
    { label: "Lượt trong 7 ngày", value: String(progress.attemptsLast7Days) },
  ];

  return (
    <div className="container-page space-y-10 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink">Xin chào, {user.displayName}</h1>
          <p className="text-sm text-muted">{user.email} · Kết quả luyện tập chỉ mình bạn xem được.</p>
        </div>
        <div className="flex gap-2">
          {user.role === "admin" && <Link href="/admin" className="btn-secondary">Khu quản trị</Link>}
          <form action={logoutAction}>
            <button type="submit" className="btn-secondary">Đăng xuất</button>
          </form>
        </div>
      </div>

      {/* Tiến độ học tập */}
      <section aria-labelledby="tien-do">
        <h2 id="tien-do" className="text-lg font-bold text-ink">Tiến độ học tập</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-bold tabular-nums text-ink">{s.value}</div>
              <div className="text-sm text-muted">{s.label}</div>
            </div>
          ))}
        </div>
        {progress.bySubject.length > 0 && (
          <div className="card mt-4 divide-y divide-line">
            {progress.bySubject.map((s) => {
              const pct = Math.round((s.bestAverage / 10) * 100);
              return (
                <div key={s.subjectId} className="grid gap-2 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center">
                  <div className="font-semibold text-ink">{idx.subject(s.subjectId)?.name ?? s.subjectId}</div>
                  <div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuemin={0} aria-valuemax={10} aria-valuenow={s.bestAverage} aria-label={`Mức đạt môn ${idx.subject(s.subjectId)?.name ?? ""}`}>
                      <div className="h-full rounded-full bg-brand-600" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {s.quizzesDone} đề · {s.attempts} lượt · điểm cao nhất TB {fmtScore(s.bestAverage)} · TB mọi lượt {fmtScore(s.averageScore)}
                    </p>
                  </div>
                  <div className="text-xs text-muted">Gần nhất {formatDate(s.lastAt)}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lịch sử làm bài */}
      <section aria-labelledby="lich-su">
        <h2 id="lich-su" className="text-lg font-bold text-ink">Lịch sử làm bài</h2>
        {attempts.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Bạn chưa làm bài nào">
              <Link href="/luyen-tap" className="text-brand-700 hover:underline">Bắt đầu luyện tập</Link>
            </EmptyState>
          </div>
        ) : (
          <div className="card mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-line bg-surface text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-3">Đề</th>
                  <th className="px-4 py-3">Môn / Lớp</th>
                  <th className="px-4 py-3">Kết quả</th>
                  <th className="px-4 py-3">Ngày làm</th>
                  <th className="px-4 py-3"><span className="sr-only">Xem lại</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {attempts.slice(0, 50).map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3 font-medium text-ink">{a.quizTitle}</td>
                    <td className="px-4 py-3 text-muted">{idx.docMeta(a)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold tabular-nums ${tone(a.score)}`}>{fmtScore(a.score)}</span>
                      <span className="text-muted"> · {a.correctCount}/{a.total} câu</span>
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(a.submittedAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/tai-khoan/lich-su/${a.id}`} className="font-medium text-brand-700 hover:underline">Xem lại</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Yêu thích */}
      <section aria-labelledby="yeu-thich">
        <h2 id="yeu-thich" className="text-lg font-bold text-ink">Tài liệu yêu thích ({favorites.length})</h2>
        <div className="mt-3">
          {favorites.length ? (
            <DocumentGrid docs={favorites} idx={idx} />
          ) : (
            <EmptyState title="Chưa lưu tài liệu nào">Bấm “☆ Lưu yêu thích” trên trang tài liệu để lưu lại.</EmptyState>
          )}
        </div>
      </section>
    </div>
  );
}

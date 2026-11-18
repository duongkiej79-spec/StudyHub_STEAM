import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultView } from "@/components/quiz-player";
import { Breadcrumbs } from "@/components/site-chrome";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/labels";
import { getRepo } from "@/lib/repo";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Xem lại bài làm", robots: { index: false } };

/** Xem lại một lượt làm bài của chính mình — người khác (kể cả đoán được id) nhận 404. */
export default async function AttemptPage({ params }: PageProps<"/tai-khoan/lich-su/[id]">) {
  const { id } = await params;
  const user = await requireUser(`/tai-khoan/lich-su/${id}`);
  if (!uuid.safeParse(id).success) notFound();
  const repo = getRepo();
  const [result, attempts] = await Promise.all([repo.getAttemptResult(user.id, id), repo.listAttempts(user.id)]);
  const summary = attempts.find((a) => a.id === id);
  if (!result || !summary) notFound();

  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumbs items={[{ href: "/tai-khoan", label: "Tài khoản" }, { label: "Xem lại bài làm" }]} />
      <h1 className="text-2xl font-bold text-ink">{summary.quizTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-muted">Làm ngày {formatDate(summary.submittedAt)}. Đáp án và lời giải hiển thị theo nội dung đề hiện tại.</p>
      <ResultView result={result} retryHref={`/luyen-tap/${summary.quizId}`} />
    </div>
  );
}

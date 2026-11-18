import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuizPlayer } from "@/components/quiz-player";
import { Breadcrumbs } from "@/components/site-chrome";
import { getCurrentUser } from "@/lib/auth";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";
import { uuid } from "@/lib/validation";

export const dynamic = "force-dynamic";

async function load(id: string) {
  if (!uuid.safeParse(id).success) return null;
  return getRepo().getPublicQuiz(id);
}

export async function generateMetadata({ params }: PageProps<"/luyen-tap/[id]">): Promise<Metadata> {
  const quiz = await load((await params).id);
  return { title: quiz ? `Luyện tập: ${quiz.title}` : "Không tìm thấy đề" };
}

export default async function QuizPage({ params }: PageProps<"/luyen-tap/[id]">) {
  const quiz = await load((await params).id);
  if (!quiz || quiz.questions.length === 0) notFound();
  const [catalog, user] = await Promise.all([getCatalog(), getCurrentUser()]);
  const idx = catalogIndex(catalog);

  return (
    <div className="container-page max-w-3xl py-8">
      <Breadcrumbs items={[{ href: "/luyen-tap", label: "Luyện tập" }, { label: quiz.title }]} />
      <p className="text-sm font-medium text-brand-700">{idx.docMeta(quiz)}</p>
      <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
      {quiz.description && <p className="mt-1 text-muted">{quiz.description}</p>}
      <div className="mt-6">
        <QuizPlayer quiz={quiz} loggedIn={!!user} />
      </div>
    </div>
  );
}

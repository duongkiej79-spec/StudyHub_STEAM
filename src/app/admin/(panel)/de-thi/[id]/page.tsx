import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteQuestionAction, deleteQuizAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { requireAdmin } from "@/lib/auth";
import { getCatalog, getRepo } from "@/lib/repo";
import { uuid } from "@/lib/validation";
import { QuestionForm, QuizForm } from "../quiz-forms";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

export default async function EditQuizPage({ params }: PageProps<"/admin/de-thi/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();
  const [catalog, quiz] = await Promise.all([getCatalog(), getRepo().getQuiz(id)]);
  if (!quiz) notFound();
  const nextOrder = Math.max(0, ...quiz.questions.map((q) => q.order)) + 1;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/de-thi" className="text-sm text-muted hover:text-ink">← Danh sách đề</Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold text-ink">{quiz.title}</h1>
          {quiz.isPublished && <Link href={`/luyen-tap/${quiz.id}`} className="btn-secondary py-2">Xem như học sinh</Link>}
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-semibold text-ink">Thông tin đề</h2>
        <QuizForm catalog={catalog} quiz={quiz} key={quiz.updatedAt} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-ink">Câu hỏi ({quiz.questions.length})</h2>
        {quiz.questions.map((q, i) => (
          <details key={q.id} className="card group p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink"><span className="mr-1 font-bold">Câu {i + 1}.</span>{q.text}</p>
                  <p className="mt-1 text-sm text-muted">
                    Đáp án đúng:{" "}
                    {q.options.map((o, oi) => (o.isCorrect ? `${LETTERS[oi]}. ${o.text}` : null)).filter(Boolean).join("") || <span className="text-rose-700">chưa chọn</span>}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-medium text-brand-700 group-open:hidden">Sửa</span>
              </div>
            </summary>
            <div className="mt-4 border-t border-line pt-4">
              <QuestionForm quizId={quiz.id} question={q} nextOrder={nextOrder} />
              <form action={deleteQuestionAction} className="mt-3">
                <input type="hidden" name="quizId" value={quiz.id} />
                <input type="hidden" name="questionId" value={q.id} />
                <ConfirmSubmit message="Xóa câu hỏi này?" className="btn-danger py-2">Xóa câu hỏi</ConfirmSubmit>
              </form>
            </div>
          </details>
        ))}
        <div className="card border-dashed p-5">
          <h3 className="mb-3 font-semibold text-ink">Thêm câu hỏi mới</h3>
          <QuestionForm quizId={quiz.id} nextOrder={nextOrder} />
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-semibold text-ink">Xóa đề</h2>
        <p className="mt-1 text-sm text-muted">Xóa vĩnh viễn đề, toàn bộ câu hỏi và lượt làm bài liên quan.</p>
        <form action={deleteQuizAction} className="mt-3">
          <input type="hidden" name="id" value={quiz.id} />
          <ConfirmSubmit message={`Xóa vĩnh viễn đề “${quiz.title}”?`}>Xóa đề</ConfirmSubmit>
        </form>
      </section>
    </div>
  );
}

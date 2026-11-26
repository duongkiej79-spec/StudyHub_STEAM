"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; content: string; isError?: boolean };
type QuizQuestion = { id: string; question: string; options: string[] };
type Quiz = { questions: QuizQuestion[]; token: string; expiresInMinutes: number };
type GradedQuestion = { id: string; selected: number | null; correctIndex: number; isCorrect: boolean; explanation: string };
type Grade = { correct: number; total: number; score: number; details: GradedQuestion[] };

function normalizeMath(text: string) {
  return text.replace(/\\\[([\s\S]*?)\\\]/g, (_, value: string) => `\n$$\n${value}\n$$\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, value: string) => `$${value}$`);
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body), cache: "no-store",
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data && typeof data.error === "string"
      ? data.error : `Máy chủ trả về HTTP ${response.status}.`;
    throw new Error(message);
  }
  return data as T;
}

export function StudyHubAiTools() {
  const [active, setActive] = useState<"chat" | "quiz">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const successfulHistory = useRef<ChatMessage[]>([]);
  const sending = useRef(false);
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(5);
  const [quizBusy, setQuizBusy] = useState(false);
  const [quizProgress, setQuizProgress] = useState("");
  const [quizError, setQuizError] = useState("");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [grading, setGrading] = useState(false);
  const [grade, setGrade] = useState<Grade | null>(null);

  async function submitChat(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || sending.current || question.length > 1200) return;
    sending.current = true;
    setChatBusy(true);
    setInput("");
    setMessages((items) => [...items, { role: "user", content: question }]);
    const context = successfulHistory.current.slice(-6).map((message) => ({
      role: message.role, content: message.content.slice(0, 1200),
    }));
    try {
      const result = await postJson<{ reply: string }>("/api/studyhub-ai/chat", {
        messages: [...context, { role: "user", content: question }],
      });
      if (!result.reply?.trim()) throw new Error("AI chưa tạo được câu trả lời.");
      successfulHistory.current = [
        ...context, { role: "user", content: question },
        { role: "assistant", content: result.reply.slice(0, 1200) },
      ].slice(-8) as ChatMessage[];
      setMessages((items) => [...items, { role: "assistant", content: result.reply }]);
    } catch (error) {
      setMessages((items) => [...items, {
        role: "assistant", isError: true,
        content: error instanceof Error ? error.message : "Không thể kết nối AI.",
      }]);
    } finally {
      sending.current = false;
      setChatBusy(false);
    }
  }

  async function extractTextFromPdf(upload: File): Promise<string> {
    if (upload.size > 8 * 1024 * 1024) throw new Error("Vui lòng chọn PDF nhỏ hơn 8 MB.");
    if (!upload.name.toLowerCase().endsWith(".pdf")) throw new Error("Chỉ hỗ trợ tệp PDF.");
    // StudyHub already copies pdf.worker.min.mjs into /public during postinstall.
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
    const bytes = new Uint8Array(await upload.arrayBuffer());
    const pdf = await pdfjs.getDocument({ data: bytes }).promise;
    const pages: string[] = [];
    try {
      for (let i = 1; i <= Math.min(pdf.numPages, 25); i++) {
        setQuizProgress(`Đang đọc PDF: trang ${i}/${Math.min(pdf.numPages, 25)}`);
        const page = await pdf.getPage(i);
        const data = await page.getTextContent();
        const text = data.items.map((item) => "str" in item ? String(item.str) : "").join(" ");
        pages.push(`Trang ${i}: ${text}`);
        if (pages.join("\n").length >= 18000) break;
      }
    } finally {
         await pdf.cleanup();
    }
    const extracted = pages.join("\n").slice(0, 18000);
    if (extracted.trim().length < 300) {
      throw new Error("PDF có quá ít văn bản. Nếu là ảnh scan, cần OCR trước khi tạo đề.");
    }
    return extracted;
  }

  async function generateQuiz() {
    if (!file || quizBusy) return;
    setQuizBusy(true);
    setQuizError("");
    setQuiz(null);
    setGrade(null);
    setAnswers({});
    try {
      const text = await extractTextFromPdf(file);
      setQuizProgress("AI đang tạo câu hỏi và đáp án…");
      const result = await postJson<Quiz>("/api/studyhub-ai/generate-quiz", { text, count });
      if (!Array.isArray(result.questions) || !result.questions.length || !result.token) {
        throw new Error("Đề trắc nghiệm chưa hợp lệ.");
      }
      setQuiz(result);
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Không thể tạo đề từ PDF.");
    } finally {
      setQuizBusy(false);
      setQuizProgress("");
    }
  }

  async function submitQuiz() {
    if (!quiz || grading || grade) return;
    setGrading(true);
    setQuizError("");
    try {
      const result = await postJson<Grade>("/api/studyhub-ai/grade", {
        token: quiz.token,
        answers: quiz.questions.map((question) => answers[question.id] ?? null),
      });
      setGrade(result);
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Không thể chấm bài.");
    } finally {
      setGrading(false);
    }
  }

  return (
    <div className="mt-7 rounded-2xl border border-[#EADBD0] bg-[#FFF9F2] shadow-sm">
      <div className="flex flex-wrap gap-2 border-b border-[#EADBD0] p-4">
        <button type="button" onClick={() => setActive("chat")}
          className={`rounded-xl px-4 py-2 font-semibold ${active === "chat" ? "bg-[#B54434] text-white" : "bg-white text-gray-800"}`}>
          ✦ Hỏi gia sư AI
        </button>
        <button type="button" onClick={() => setActive("quiz")}
          className={`rounded-xl px-4 py-2 font-semibold ${active === "quiz" ? "bg-[#B54434] text-white" : "bg-white text-gray-800"}`}>
          📄 PDF → Trắc nghiệm
        </button>
      </div>
      {active === "chat" ? (
        <div className="p-4 md:p-6">
          <div className="max-h-[460px] min-h-[290px] space-y-3 overflow-y-auto rounded-xl bg-white p-4" aria-live="polite">
            {messages.length === 0 && <p className="text-sm text-gray-600">Bạn muốn hỏi bài môn nào? StudyHub AI sẽ giải thích từng bước. <Link className="text-blue-600 underline" href="/dang-nhap">Đăng nhập</Link> nếu chưa có phiên sử dụng.</p>}
            {messages.map((message, index) => (
              <div key={index} className={`rounded-xl p-3 text-sm ${message.role === "user" ? "ml-8 bg-[#F6E4D7]" : message.isError ? "mr-8 bg-red-50 text-red-700" : "mr-8 bg-gray-50 text-gray-900"}`}>
                {message.role === "assistant" && !message.isError ? (
                  <div className="prose prose-sm max-w-none [&_.katex-display]:overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{normalizeMath(message.content)}</ReactMarkdown>
                  </div>
                ) : <span className="whitespace-pre-wrap">{message.content}</span>}
              </div>
            ))}
            {chatBusy && <p className="text-sm text-gray-500">StudyHub AI đang trả lời…</p>}
          </div>
          <form onSubmit={(event) => void submitChat(event)} className="mt-3 flex gap-2">
            <input aria-label="Nhập câu hỏi" value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder="Nhập câu hỏi tối đa 1.200 ký tự…" className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-3 text-sm" />
            <button disabled={chatBusy || !input.trim()} type="submit" className="rounded-xl bg-[#B54434] px-5 py-3 font-semibold text-white disabled:opacity-50">Gửi</button>
          </form>
          <p className="mt-2 text-right text-xs text-gray-500">{input.length}/1200 ký tự</p>
        </div>
      ) : (
        <div className="space-y-5 p-4 md:p-6">
          <div className="rounded-xl bg-white p-4">
            <h2 className="font-bold text-gray-900">Chuyển tài liệu PDF thành đề trắc nghiệm</h2>
            <p className="mt-1 text-sm text-gray-600">Hỗ trợ PDF có văn bản; câu hỏi được AI đề xuất và cần kiểm tra đáp án trước khi dùng để đánh giá chính thức. PDF không lưu lên máy chủ, chỉ văn bản trích xuất được gửi để tạo đề.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <label className="block text-sm font-medium text-gray-800">Chọn PDF (tối đa 8 MB)
                <input type="file" accept=".pdf,application/pdf" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setQuiz(null); setGrade(null); setQuizError(""); }} className="mt-2 block w-full text-sm" />
              </label>
              <label className="block text-sm font-medium text-gray-800">Số câu hỏi
                <select value={count} onChange={(event) => setCount(Number(event.target.value))} className="mt-2 block w-full rounded-lg border bg-white p-2.5">
                  <option value={5}>5 câu</option><option value={10}>10 câu</option><option value={15}>15 câu</option>
                </select>
              </label>
              <button type="button" onClick={() => void generateQuiz()} disabled={!file || quizBusy} className="rounded-lg bg-[#B54434] px-5 py-2.5 font-semibold text-white disabled:opacity-50">
                {quizBusy ? "Đang tạo…" : "Tạo bài kiểm tra"}
              </button>
            </div>
            {quizProgress && <p className="mt-3 text-sm text-gray-600">{quizProgress}</p>}
          </div>
          {quizError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{quizError}</p>}
          {quiz && (
            <div className="space-y-5 rounded-xl bg-white p-4 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-900">Bài kiểm tra từ PDF</h2>
                <p className="text-sm text-gray-500">{quiz.questions.length} câu • 4 lựa chọn • Hết hạn sau {quiz.expiresInMinutes} phút</p>
              </div>
              {quiz.questions.map((question, index) => {
                const result = grade?.details.find((item) => item.id === question.id);
                return (
                  <fieldset key={question.id} className="space-y-2 border-t pt-4" disabled={Boolean(grade)}>
                    <legend className="pt-4 font-semibold text-gray-900">Câu {index + 1}. {question.question}</legend>
                    {question.options.map((option, optionIndex) => (
                      <label key={optionIndex} className="flex cursor-pointer items-start gap-2 rounded-lg p-2 hover:bg-gray-50">
                        <input type="radio" name={`question-${question.id}`} checked={answers[question.id] === optionIndex} onChange={() => setAnswers((value) => ({ ...value, [question.id]: optionIndex }))} className="mt-1" />
                        <span className="text-sm text-gray-800">{String.fromCharCode(65 + optionIndex)}. {option}</span>
                      </label>
                    ))}
                    {result && <div className={`rounded-lg p-3 text-sm ${result.isCorrect ? "bg-green-50 text-green-800" : "bg-orange-50 text-orange-900"}`}>
                      <strong>{result.isCorrect ? "Đúng" : "Chưa đúng"} – Đáp án {String.fromCharCode(65 + result.correctIndex)}</strong>
                      <p className="mt-1">{result.explanation}</p>
                    </div>}
                  </fieldset>
                );
              })}
              {!grade ? (
               <button
  type="button"
  disabled={grading}
  onClick={() => void submitQuiz()}
  className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-50"
>
  {grading ? "Đang chấm…" : "Nộp bài & chấm điểm"}
</button>
              ) : (
                <div className="rounded-xl bg-blue-50 p-5 text-center">
                  <p className="text-sm text-gray-700">Kết quả</p>
                  <p className="text-3xl font-bold text-blue-700">{grade.score}/10</p>
                  <p className="text-sm text-gray-700">Đúng {grade.correct}/{grade.total} câu</p>
                  <button type="button" onClick={() => { setQuiz(null); setGrade(null); setAnswers({}); }} className="mt-3 rounded-lg border bg-white px-4 py-2 text-sm">Tạo đề khác</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

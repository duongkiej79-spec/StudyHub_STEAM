"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; content: string; isError?: boolean };
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const successfulHistory = useRef<ChatMessage[]>([]);
  const sending = useRef(false);
  const [input, setInput] = useState("");
  const [chatBusy, setChatBusy] = useState(false);

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

  return (
    <div className="mt-7 rounded-2xl border border-[#EADBD0] bg-[#FFF9F2] shadow-sm">
      <div className="border-b border-[#EADBD0] p-4">
        <h2 className="font-semibold text-[#B54434]">✦ Hỏi gia sư AI</h2>
      </div>
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
    </div>
  );
}

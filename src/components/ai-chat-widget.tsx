"use client"

import { useState } from "react";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function normalizeMath(text: string): string {
  return text
    .replace(
      /\\\[([\s\S]*?)\\\]/g,
      (_, math: string) => `\n$$\n${math}\n$$\n`
    )
    .replace(
      /\\\(([\s\S]*?)\\\)/g,
      (_, math: string) => `$${math}$`
    );
}

export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  async function sendMessage() {
    const question = input.trim();
    if (!question || loading) return;

    const next: Message[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.slice(-8),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Không thể kết nối AI");
      }

      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply || "Chưa có câu trả lời.",
        },
      ]);
    } catch (error) {
      setMessages([
        ...next,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 rounded-full bg-[#B54434] px-5 py-3 font-bold text-white shadow-xl hover:bg-[#96362A]"
      >
        {open ? "✕ Đóng" : "✦ Hỏi StudyHub AI"}
      </button>

      {open && (
        <section
          aria-label="StudyHub AI"
          className="fixed bottom-24 right-6 z-50 flex h-[500px] max-h-[70vh] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-[#EADBD0] bg-[#FFF9F2] shadow-2xl"
        >
          <div className="bg-[#B54434] p-4 text-white">
            <h2 className="text-lg font-bold">
              ✦ StudyHub AI
            </h2>
            <p className="text-sm">
              Trợ lý học tập lớp 10, 11, 12
            </p>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {messages.length === 0 && (
              <p className="rounded-xl bg-white p-4 text-sm text-gray-700">
                Xin chào! Bạn cần giúp đỡ môn học nào?
                Hãy gửi câu hỏi để mình hỗ trợ nhé.
              </p>
            )}

{messages.map((message, index) => (
  <div
    key={index}
    className={`rounded-xl p-3 text-sm ${
      message.role === "user"
        ? "ml-8 bg-[#F6E4D7]"
        : "mr-8 bg-white"
    }`}
  >
    {message.role === "assistant" ? (
      <div
        className="
          leading-7
          [&_p]:mb-3
          [&_p:last-child]:mb-0
          [&_strong]:font-bold
          [&_ul]:list-disc
          [&_ol]:list-decimal
          [&_li]:ml-5
          [&_.katex-display]:overflow-x-auto
          [&_.katex-display]:py-2
        "
      >
        <ReactMarkdown
          remarkPlugins={[remarkMath]}
          rehypePlugins={[rehypeKatex]}
        >
          {normalizeMath(message.content)}
        </ReactMarkdown>
      </div>
    ) : (
      <span className="whitespace-pre-wrap">
        {message.content}
      </span>
    )}
  </div>
))}

            
              

            {loading && (
              <p className="text-sm text-gray-500">
                StudyHub AI đang trả lời...
              </p>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="flex gap-2 border-t bg-white p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập câu hỏi..."
              maxLength={1200}
              className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm text-gray-900"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-[#B54434] px-4 py-2 text-white disabled:opacity-50"
            >
              Gửi
            </button>
          </form>
        </section>
      )}
    </>
  );
}

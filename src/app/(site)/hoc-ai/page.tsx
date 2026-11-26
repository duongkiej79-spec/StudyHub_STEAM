
import type { Metadata } from "next";
import { StudyHubAiTools } from "@/components/studyhub-ai-tools";

export const metadata: Metadata = {
  title: "Học cùng AI – StudyHub",
  description:
    "Hỏi gia sư AI và tạo bài trắc nghiệm từ PDF để luyện tập và chấm điểm.",
};

export default function HocAiPage() {
  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold text-[#B54434]">
          StudyHub AI 2.0
        </p>

        <h1 className="mt-2 text-3xl font-bold text-ink">
          Trợ lý học tập và tạo đề từ PDF
        </h1>

        <p className="mt-2 text-sm text-muted">
          Dành cho học sinh lớp 10, 11, 12.
          Đăng nhập để sử dụng.
        </p>

        <StudyHubAiTools />
      </div>
    </div>
  );
}

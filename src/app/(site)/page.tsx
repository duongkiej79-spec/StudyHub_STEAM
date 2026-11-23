import Link from "next/link";
import { ExamCountdowns } from "@/components/exam-countdowns";

import { DocumentGrid } from "@/components/document-card";
import { SearchBox } from "@/components/search-box";
import { catalogIndex } from "@/lib/catalog";
import { getCatalog, getRepo } from "@/lib/repo";

export const dynamic = "force-dynamic";

// Mau nen lay cam hung tu anh Ha Noi: giay kem, do co, vang sao, xanh la.
const subjectThemes: Record<
  string,
  { symbol: string; iconBg: string; iconColor: string; cardBg: string }
> = {
  "Toán": {
    symbol: "∑",
    iconBg: "bg-[#F8E2D1]",
    iconColor: "text-[#B04434]",
    cardBg: "bg-[#FFF4E9]",
  },
  "Ngữ văn": {
    symbol: "Aa",
    iconBg: "bg-[#F9DBD7]",
    iconColor: "text-[#B63E36]",
    cardBg: "bg-[#FFF0EC]",
  },
  "Tiếng Anh": {
    symbol: "EN",
    iconBg: "bg-[#DCECE7]",
    iconColor: "text-[#397766]",
    cardBg: "bg-[#EFF8F4]",
  },
  "Vật lý": {
    symbol: "⚛",
    iconBg: "bg-[#DAEAE4]",
    iconColor: "text-[#367861]",
    cardBg: "bg-[#EFF8F1]",
  },
  "Vật lí": {
    symbol: "⚛",
    iconBg: "bg-[#DAEAE4]",
    iconColor: "text-[#367861]",
    cardBg: "bg-[#EFF8F1]",
  },
  "Hóa học": {
    symbol: "⚗",
    iconBg: "bg-[#FFF0C6]",
    iconColor: "text-[#93671A]",
    cardBg: "bg-[#FFFAE9]",
  },
  "Sinh học": {
    symbol: "✿",
    iconBg: "bg-[#DEF0D8]",
    iconColor: "text-[#4D7C45]",
    cardBg: "bg-[#F1F9EB]",
  },
  "Lịch sử": {
    symbol: "⌛",
    iconBg: "bg-[#F4DDD1]",
    iconColor: "text-[#A15836]",
    cardBg: "bg-[#FFF5ED]",
  },
  "Địa lí": {
    symbol: "◎",
    iconBg: "bg-[#D9EDF0]",
    iconColor: "text-[#2F7882]",
    cardBg: "bg-[#EDF8FA]",
  },
  "Tin học": {
    symbol: "</>",
    iconBg: "bg-[#E5E3F5]",
    iconColor: "text-[#65579E]",
    cardBg: "bg-[#F5F3FC]",
  },
  "Công nghệ": {
    symbol: "⚙",
    iconBg: "bg-[#E1E9E6]",
    iconColor: "text-[#49776B]",
    cardBg: "bg-[#F2F7F4]",
  },
  "Giáo dục kinh tế và pháp luật": {
    symbol: "§",
    iconBg: "bg-[#FFE6CE]",
    iconColor: "text-[#A76529]",
    cardBg: "bg-[#FFF6EC]",
  },
  "Giáo dục quốc phòng và an ninh": {
    symbol: "★",
    iconBg: "bg-[#F8DFD8]",
    iconColor: "text-[#AF4033]",
    cardBg: "bg-[#FFF2ED]",
  },
};

const defaultTheme = {
  symbol: "✦",
  iconBg: "bg-[#F2E6D6]",
  iconColor: "text-[#9B6345]",
  cardBg: "bg-white",
};

const hiddenSubjects = new Set([
  "Giáo dục thể chất",
  "Âm nhạc",
  "Mĩ thuật",
  "Mỹ thuật",
  "Hoạt động trải nghiệm",
  "Hoạt động trải nghiệm, hướng nghiệp",
]);

export default async function HomePage() {
  const repo = getRepo();
  const [catalog, docs, quizzes] = await Promise.all([
    getCatalog(),
    repo.listPublishedDocuments(),
    repo.listPublishedQuizzes(),
  ]);
  const idx = catalogIndex(catalog);
  const latest = [...docs]
    .sort((a, b) =>
      (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
    )
    .slice(0, 6);
  const subjects = idx
    .subjectsSorted()
    .filter((subject) => !hiddenSubjects.has(subject.name));

  return (
    <div className="overflow-hidden bg-[#FFF9F2] text-[#332A27]">
      {/* HERO: giu nguyen tieu de, tim kiem, chon lop; bo MY STUDY SPACE */}
      <section className="relative isolate overflow-hidden border-b border-[#ECDCCD] bg-[#FBF1E8]">
        {/* Hinh nen do ban da them vao public/images */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/studyhub-bg.webp')" }}
        />
        {/* Lop phu mau giay kem: de doc ben trai, nhin ro tranh ben phai */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-r from-[#FFF9F2]/95 via-[#FFF9F2]/80 to-[#FFF9F2]/15"
        />

        <div className="container-page relative z-10 py-16 sm:py-20 lg:py-24">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#EBC8AD] bg-[#FFF8EC]/90 px-4 py-2 text-xs font-semibold text-[#9F4636] shadow-sm">
              <span aria-hidden="true" className="text-base text-[#C28E26]">✦</span>
              KHÔNG GIAN HỌC TẬP CỦA BẠN
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-[1.17] tracking-tight text-[#382D29] sm:text-5xl lg:text-[52px]">
              Học thông minh hơn,
              <span className="mt-2 block text-[#B33F32]">
                mỗi ngày một chút.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-8 text-[#63574E]">
              Khám phá thư viện tài liệu lớp 10, 11, 12. Học theo từng môn,
              xem PDF miễn phí và luyện trắc nghiệm có lời giải ngay trên
              StudyHub.
            </p>

            <div className="mt-8 max-w-2xl rounded-[22px] border border-[#F2E5D7] bg-white/95 p-2 shadow-[0_12px_45px_rgba(103,54,40,0.10)]">
              <SearchBox size="lg" />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium text-[#715E54]">
                Chọn khối lớp:
              </span>
              {catalog.grades.map((grade) => (
                <Link
                  key={grade.id}
                  href={`/thu-vien/${grade.slug}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#EACDB7] bg-[#FFF9F1]/95 px-5 text-sm font-semibold text-[#974438] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C88968] hover:bg-[#FCE6D3] hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B33F32]"
                >
                  {grade.name}
                </Link>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-6 text-sm text-[#5B524B]">
              <span className="flex items-center gap-2">
                <span className="text-[#317C5D]">✓</span> Miễn phí
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#317C5D]">✓</span> Có lời giải
              </span>
              <span className="flex items-center gap-2">
                <span className="text-[#317C5D]">✓</span> Không cần đăng nhập để đọc
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 the thong ke, so lieu lay tu he thong */}
      <section className="container-page py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#F0DDC8] bg-[#FFF0DD] px-6 py-5">
            <p className="text-sm font-medium text-[#96663A]">Khối lớp</p>
            <p className="mt-1 text-2xl font-bold text-[#A45A28]">
              {catalog.grades.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#E8CBC2] bg-[#FBE9E3] px-6 py-5">
            <p className="text-sm font-medium text-[#A66254]">
              Tài liệu công khai
            </p>
            <p className="mt-1 text-2xl font-bold text-[#B33F32]">
              {docs.length}
            </p>
          </div>
          <div className="rounded-2xl border border-[#D8E9D7] bg-[#EBF4E7] px-6 py-5">
            <p className="text-sm font-medium text-[#567D59]">
              Bộ đề luyện tập
            </p>
            <p className="mt-1 text-2xl font-bold text-[#39784C]">
              {quizzes.length}
            </p>
          </div>
        </div>
      </section>

{/* Đồng hồ đếm ngược TSA, V-ACT, THPT */}
<ExamCountdowns />


      {/* Mon hoc */}
      <section className="container-page py-10 sm:py-14">
        <div className="mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45B37]">
            KHÁM PHÁ KIẾN THỨC
          </p>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#382D29] sm:text-3xl">
            Hôm nay bạn muốn học môn gì?
          </h2>
          <p className="mt-2 text-sm text-[#776A61]">
            Chọn môn học yêu thích để khám phá tài liệu.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {subjects.map((subject) => {
            const theme = subjectThemes[subject.name] ?? defaultTheme;
            const count = docs.filter((doc) => doc.subjectId === subject.id).length;
            return (
              <Link
                key={subject.id}
                href={`/tim-kiem?mon=${subject.id}`}
                className={`group rounded-[22px] border border-[#EADFD3] p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-[#D3A98C] hover:shadow-[0_15px_35px_rgba(110,70,48,0.11)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B33F32] ${theme.cardBg}`}
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-extrabold ${theme.iconBg} ${theme.iconColor}`}>
                  {theme.symbol}
                </div>
                <h3 className="text-base font-bold text-[#382D29]">
                  {subject.name}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-xs text-[#7D7168]">
                    {count} tài liệu
                  </p>
                  <span aria-hidden="true" className="text-[#A75A42] transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Tai lieu moi: giu DocumentGrid de khong anh huong PDF */}
      <section className="container-page py-10 sm:py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B45B37]">
              THƯ VIỆN STUDYHUB
            </p>
            <h2 className="mt-2 text-2xl font-extrabold text-[#382D29] sm:text-3xl">
              Tài liệu mới cập nhật
            </h2>
            <p className="mt-2 text-sm text-[#776A61]">
              Những tài liệu mới nhất để bạn học và ôn tập.
            </p>
          </div>
          <Link
            href="/tim-kiem?sap-xep=moi-nhat"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#E7C9B6] bg-white px-5 text-sm font-semibold text-[#A14134] transition-colors hover:bg-[#FFF0E2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B33F32]"
          >
            Xem tất cả <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="mt-7">
          <DocumentGrid docs={latest} idx={idx} />
        </div>
      </section>

      {/* Banner luyen tap */}
      <section className="container-page pb-16 pt-8 sm:pb-20">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#993D33] via-[#B44735] to-[#CC7745] px-7 py-10 text-white shadow-[0_20px_50px_rgba(114,57,41,0.18)] sm:px-10 sm:py-12">
          <div aria-hidden="true" className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[35px] border-[#FFECCB]/10" />
          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FFE6C6]">
                HỌC ĐI ĐÔI VỚI HÀNH
              </p>
              <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                Sẵn sàng thử sức với trắc nghiệm?
              </h2>
              <p className="mt-3 text-sm leading-7 text-white/90">
                Khám phá {quizzes.length} bộ đề luyện tập theo lớp và môn học.
                Hoàn thành bài làm, xem điểm và tìm hiểu lời giải để tiến bộ mỗi ngày.
              </p>
            </div>
            <Link
              href="/luyen-tap"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-[#FFF8EC] px-6 py-3 text-sm font-bold text-[#9E3B30] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Bắt đầu luyện tập <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

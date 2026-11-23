/**
 * Dữ liệu mẫu cho bản demo. Dùng chung cho:
 *   - kho dữ liệu cục bộ (src/lib/repo/local.ts) khi chạy lần đầu;
 *   - scripts/gen-seed-sql.ts  → supabase/seed.sql;
 *   - scripts/make-sample-pdfs.ts → storage/samples/*.pdf.
 * Chỉ import kiểu (`import type`) để file chạy được trực tiếp bằng Node.
 * Toàn bộ nội dung do nhóm tự biên soạn cho mục đích minh họa.
 */
import { createHash } from "node:crypto";
import type {
  Catalog,
  Chapter,
  DocumentStatus,
  DocumentType,
  GradeId,
  Lesson,
  Question,
  Quiz,
  StudyDocument,
} from "./types";

/** UUID ổn định sinh từ một khóa đọc được — để seed chạy lại không đổi id. */
export function seedId(key: string): string {
  const h = createHash("sha1").update(`studyhub:${key}`).digest("hex");
  const variant = ((parseInt(h[16], 16) & 0x3) | 0x8).toString(16);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${variant}${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

const SAMPLE_SOURCE = "Nhóm StudyHub biên soạn";
const SAMPLE_LICENSE = "Tự biên soạn — chia sẻ miễn phí cho mục đích học tập";

// ---------------------------------------------------------------- Danh mục

const grades: Catalog["grades"] = [
  { id: 10, name: "Lớp 10", slug: "lop-10" },
  { id: 11, name: "Lớp 11", slug: "lop-11" },
  { id: 12, name: "Lớp 12", slug: "lop-12" },
];


const subjects: Catalog["subjects"] = [
  { id: "toan", name: "Toán", order: 1 },
  { id: "ngu-van", name: "Ngữ văn", order: 2 },
  { id: "tieng-anh", name: "Tiếng Anh", order: 3 },
  { id: "vat-ly", name: "Vật lý", order: 4 },
  { id: "hoa-hoc", name: "Hóa học", order: 5 },
  { id: "sinh-hoc", name: "Sinh học", order: 6 },
  { id: "lich-su", name: "Lịch sử", order: 7 },
  { id: "dia-li", name: "Địa lí", order: 8 },
  { id: "tin-hoc", name: "Tin học", order: 9 },
  { id: "cong-nghe", name: "Công nghệ", order: 10 },
  {
    id: "gdkt-pl",
    name: "Giáo dục kinh tế và pháp luật",
    order: 11,
  },
  {
    id: "gdqp-an",
    name: "Giáo dục quốc phòng và an ninh",
    order: 12,
  },
];

const series: Catalog["series"] = [
  {
    id: "ket-noi",
    name: "Kết nối tri thức với cuộc sống",
  },
  {
    id: "chan-troi",
    name: "Chân trời sáng tạo",
  },
  {
    id: "canh-dieu",
    name: "Cánh diều",
  },
];

type ChapterSeed = {
  key: string;
  grade: GradeId;
  subject: string;
  series: string | null;
  title: string;
  lessons: { key: string; title: string }[];
};

const chapterSeeds: ChapterSeed[] = [
  { key: "toan10-c1", grade: 10, subject: "toan", series: "ket-noi", title: "Mệnh đề và tập hợp",
    lessons: [{ key: "toan10-c1-l1", title: "Mệnh đề" }, { key: "toan10-c1-l2", title: "Tập hợp và các phép toán trên tập hợp" }] },
  { key: "toan10-c6", grade: 10, subject: "toan", series: "ket-noi", title: "Hàm số, đồ thị và ứng dụng",
    lessons: [{ key: "toan10-c6-l1", title: "Hàm số" }, { key: "toan10-c6-l2", title: "Hàm số bậc hai" }] },
  { key: "toan11-c1", grade: 11, subject: "toan", series: "ket-noi", title: "Hàm số lượng giác và phương trình lượng giác",
    lessons: [{ key: "toan11-c1-l1", title: "Giá trị lượng giác của góc lượng giác" }, { key: "toan11-c1-l2", title: "Phương trình lượng giác cơ bản" }] },
  { key: "toan12-c1", grade: 12, subject: "toan", series: "ket-noi", title: "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số",
    lessons: [{ key: "toan12-c1-l1", title: "Tính đơn điệu và cực trị của hàm số" }] },
  { key: "toan12-c4", grade: 12, subject: "toan", series: "ket-noi", title: "Nguyên hàm và tích phân",
    lessons: [{ key: "toan12-c4-l1", title: "Nguyên hàm" }, { key: "toan12-c4-l2", title: "Tích phân" }] },
  { key: "ly10-c2", grade: 10, subject: "vat-ly", series: "ket-noi", title: "Động học",
    lessons: [{ key: "ly10-c2-l1", title: "Chuyển động thẳng biến đổi đều" }] },
  { key: "ly11-c1", grade: 11, subject: "vat-ly", series: "ket-noi", title: "Dao động",
    lessons: [{ key: "ly11-c1-l1", title: "Dao động điều hòa" }] },
  { key: "ly12-c1", grade: 12, subject: "vat-ly", series: "ket-noi", title: "Vật lí nhiệt",
    lessons: [{ key: "ly12-c1-l1", title: "Cấu trúc của chất. Sự chuyển thể" }] },
  { key: "hoa10-c1", grade: 10, subject: "hoa-hoc", series: "ket-noi", title: "Cấu tạo nguyên tử",
    lessons: [{ key: "hoa10-c1-l1", title: "Thành phần của nguyên tử" }, { key: "hoa10-c1-l2", title: "Cấu trúc lớp vỏ electron nguyên tử" }] },
  { key: "hoa11-c1", grade: 11, subject: "hoa-hoc", series: "ket-noi", title: "Cân bằng hóa học",
    lessons: [{ key: "hoa11-c1-l1", title: "Cân bằng trong dung dịch nước" }] },
  { key: "hoa12-c1", grade: 12, subject: "hoa-hoc", series: "ket-noi", title: "Ester – Lipid",
    lessons: [{ key: "hoa12-c1-l1", title: "Ester – Lipid" }] },
  { key: "van10-c1", grade: 10, subject: "ngu-van", series: "ket-noi", title: "Sức hấp dẫn của truyện kể",
    lessons: [{ key: "van10-c1-l1", title: "Thần thoại" }] },
  { key: "van12-c1", grade: 12, subject: "ngu-van", series: null, title: "Viết: Nghị luận xã hội",
    lessons: [{ key: "van12-c1-l1", title: "Nghị luận về một vấn đề xã hội" }] },
  { key: "anh11-g1", grade: 11, subject: "tieng-anh", series: null, title: "Grammar: Tenses",
    lessons: [{ key: "anh11-g1-l1", title: "Present perfect & Past simple" }] },
  { key: "anh12-g1", grade: 12, subject: "tieng-anh", series: null, title: "Grammar: Passive voice",
    lessons: [{ key: "anh12-g1-l1", title: "Passive voice" }] },
];

const chapters: Chapter[] = [];
const lessons: Lesson[] = [];
chapterSeeds.forEach((c, ci) => {
  chapters.push({
    id: seedId(c.key),
    gradeId: c.grade,
    subjectId: c.subject,
    seriesId: c.series,
    title: c.title,
    order: ci + 1,
  });
  c.lessons.forEach((l, li) =>
    lessons.push({ id: seedId(l.key), chapterId: seedId(c.key), title: l.title, order: li + 1 }),
  );
});

export const seedCatalog: Catalog = { grades, subjects, series, chapters, lessons };

// ---------------------------------------------------------------- Tài liệu

export type SeedDocument = {
  key: string;
  title: string;
  lesson: string; // khóa bài học
  type: DocumentType;
  description: string;
  status: DocumentStatus;
  hasFile: boolean;
  date: string; // ngày cập nhật (YYYY-MM-DD)
};

export const seedDocumentList: SeedDocument[] = [
  { key: "toan12-nguyen-ham-cong-thuc", title: "Công thức nguyên hàm cơ bản – Toán 12", lesson: "toan12-c4-l1", type: "tom_tat",
    description: "Bảng nguyên hàm của các hàm số thường gặp, tính chất và ví dụ áp dụng nhanh.", status: "published", hasFile: true, date: "2026-11-12" },
  { key: "toan12-tich-phan-ly-thuyet", title: "Tích phân: lý thuyết và ví dụ minh họa", lesson: "toan12-c4-l2", type: "ly_thuyet",
    description: "Định nghĩa tích phân, các tính chất cơ bản và ứng dụng tính diện tích hình phẳng.", status: "published", hasFile: true, date: "2026-11-12" },
  { key: "toan12-on-tap-nguyen-ham-tich-phan", title: "Đề ôn tập chương Nguyên hàm – Tích phân", lesson: "toan12-c4-l2", type: "de_kiem_tra",
    description: "5 câu tự luận có đáp án chi tiết để tự kiểm tra cuối chương.", status: "published", hasFile: true, date: "2026-11-14" },
  { key: "toan12-don-dieu-cuc-tri", title: "Bài tập tính đơn điệu và cực trị có lời giải", lesson: "toan12-c1-l1", type: "bai_tap",
    description: "Các bài tập xét chiều biến thiên và tìm cực trị của hàm bậc ba, bậc bốn trùng phương.", status: "published", hasFile: true, date: "2026-11-08" },
  { key: "toan10-menh-de-tap-hop", title: "Mệnh đề và tập hợp – Tóm tắt lý thuyết", lesson: "toan10-c1-l2", type: "tom_tat",
    description: "Mệnh đề, phủ định, mệnh đề kéo theo; tập hợp và các phép toán giao, hợp, hiệu.", status: "published", hasFile: true, date: "2026-11-05" },
  { key: "toan10-ham-so-bac-hai", title: "Hàm số bậc hai – Bài tập có lời giải", lesson: "toan10-c6-l2", type: "bai_tap",
    description: "Xác định đỉnh, trục đối xứng, chiều biến thiên và tìm parabol qua hai điểm.", status: "published", hasFile: true, date: "2026-11-06" },
  { key: "toan11-pt-luong-giac", title: "Phương trình lượng giác cơ bản – Công thức nghiệm", lesson: "toan11-c1-l2", type: "tom_tat",
    description: "Công thức nghiệm của sin x = a, cos x = a, tan x = a, cot x = a và các trường hợp đặc biệt.", status: "published", hasFile: true, date: "2026-11-09" },
  { key: "ly10-bien-doi-deu", title: "Chuyển động thẳng biến đổi đều – Công thức", lesson: "ly10-c2-l1", type: "tom_tat",
    description: "Gia tốc, vận tốc, độ dịch chuyển và hệ thức độc lập thời gian, kèm ví dụ.", status: "published", hasFile: true, date: "2026-11-10" },
  { key: "ly11-dao-dong-dieu-hoa", title: "Dao động điều hòa – Lý thuyết trọng tâm", lesson: "ly11-c1-l1", type: "ly_thuyet",
    description: "Phương trình li độ, vận tốc, gia tốc; chu kì, tần số và các giá trị cực đại.", status: "published", hasFile: true, date: "2026-11-11" },
  { key: "ly12-cau-truc-chat", title: "Cấu trúc của chất – Câu hỏi ôn tập", lesson: "ly12-c1-l1", type: "de_kiem_tra",
    description: "Câu hỏi ôn tập mô hình động học phân tử và sự chuyển thể (đang chờ duyệt).", status: "pending", hasFile: true, date: "2026-11-16" },
  { key: "hoa10-cau-tao-nguyen-tu", title: "Cấu tạo nguyên tử – Tóm tắt", lesson: "hoa10-c1-l1", type: "tom_tat",
    description: "Thành phần nguyên tử, số khối, đồng vị, nguyên tử khối trung bình và cấu hình electron.", status: "published", hasFile: true, date: "2026-11-07" },
  { key: "hoa11-ph-bai-tap", title: "pH của dung dịch – Bài tập có lời giải", lesson: "hoa11-c1-l1", type: "bai_tap",
    description: "Tính pH của dung dịch acid mạnh, base mạnh và nhận biết môi trường.", status: "published", hasFile: true, date: "2026-11-13" },
  { key: "hoa12-ester-so-do", title: "Ester – Lipid: Sơ đồ tư duy", lesson: "hoa12-c1-l1", type: "tom_tat",
    description: "Bản nháp, chưa có tệp đính kèm.", status: "draft", hasFile: false, date: "2026-11-16" },
  { key: "anh11-cac-thi", title: "Thì hiện tại hoàn thành và quá khứ đơn", lesson: "anh11-g1-l1", type: "tom_tat",
    description: "Cấu trúc, cách dùng, dấu hiệu nhận biết và cách phân biệt hai thì dễ nhầm lẫn.", status: "published", hasFile: true, date: "2026-11-04" },
  { key: "anh12-bi-dong", title: "Câu bị động – Lý thuyết và bài tập", lesson: "anh12-g1-l1", type: "bai_tap",
    description: "Công thức bị động theo từng thì, động từ khuyết thiếu và bài tập chuyển câu có đáp án.", status: "published", hasFile: true, date: "2026-11-03" },
  { key: "van10-than-thoai", title: "Đặc trưng thể loại thần thoại", lesson: "van10-c1-l1", type: "ly_thuyet",
    description: "Không gian, thời gian, nhân vật, cốt truyện của thần thoại và hướng dẫn đọc hiểu.", status: "published", hasFile: true, date: "2026-11-02" },
  { key: "van12-nlxh", title: "Cách làm bài nghị luận xã hội", lesson: "van12-c1-l1", type: "ly_thuyet",
    description: "Dàn ý chung, các bước triển khai luận điểm và lỗi thường gặp khi viết bài.", status: "published", hasFile: true, date: "2026-11-01" },
];

function toIso(date: string, hour = 8): string {
  return new Date(`${date}T${String(hour).padStart(2, "0")}:00:00+07:00`).toISOString();
}

export function sampleFilePath(key: string): string {
  return `samples/${key}.pdf`;
}

/** storage/samples/manifest.json — do scripts/make-sample-pdfs.ts sinh ra. */
export type SampleManifest = Record<string, { size: number; pages: number }>;

export function buildSeedDocuments(manifest: SampleManifest = {}): StudyDocument[] {
  return seedDocumentList.map((d) => {
    const lesson = lessons.find((l) => l.id === seedId(d.lesson));
    if (!lesson) throw new Error(`Seed: không tìm thấy bài học ${d.lesson}`);
    const chapter = chapters.find((c) => c.id === lesson.chapterId)!;
    const filePath = d.hasFile ? sampleFilePath(d.key) : null;
    return {
      id: seedId(`doc:${d.key}`),
      title: d.title,
      gradeId: chapter.gradeId,
      subjectId: chapter.subjectId,
      seriesId: chapter.seriesId,
      chapterId: chapter.id,
      lessonId: lesson.id,
      type: d.type,
      description: d.description,
      filePath,
      fileSize: filePath ? (manifest[filePath]?.size ?? null) : null,
      pageCount: filePath ? (manifest[filePath]?.pages ?? null) : null,
      source: SAMPLE_SOURCE,
      licenseNote: SAMPLE_LICENSE,
      status: d.status,
      reviewNote: null,
      createdAt: toIso(d.date),
      updatedAt: toIso(d.date, 9),
      publishedAt: d.status === "published" ? toIso(d.date, 9) : null,
    };
  });
}

// ---------------------------------------------------------------- Trắc nghiệm

type QSeed = { text: string; options: string[]; correct: number; explanation: string };
type QuizSeed = {
  key: string;
  title: string;
  description: string;
  chapter: string;
  durationMinutes: number | null;
  isPublished: boolean;
  questions: QSeed[];
};

const quizSeeds: QuizSeed[] = [
  {
    key: "quiz-toan12-nguyen-ham",
    title: "Nguyên hàm cơ bản",
    description: "6 câu kiểm tra bảng nguyên hàm và cách tìm nguyên hàm thỏa điều kiện.",
    chapter: "toan12-c4",
    durationMinutes: 10,
    isPublished: true,
    questions: [
      { text: "Họ nguyên hàm của hàm số f(x) = x³ là:", options: ["x⁴/4 + C", "3x² + C", "x⁴ + C", "x³/3 + C"], correct: 0,
        explanation: "Áp dụng ∫xⁿ dx = xⁿ⁺¹/(n+1) + C với n = 3, ta được x⁴/4 + C." },
      { text: "∫ eˣ dx bằng:", options: ["eˣ + C", "x·eˣ⁻¹ + C", "eˣ⁺¹/(x+1) + C", "ln x + C"], correct: 0,
        explanation: "Đạo hàm của eˣ là chính nó, nên ∫ eˣ dx = eˣ + C." },
      { text: "Với x ≠ 0, ∫ (1/x) dx bằng:", options: ["ln|x| + C", "−1/x² + C", "1/x² + C", "x·ln x + C"], correct: 0,
        explanation: "(ln|x|)' = 1/x với mọi x ≠ 0, nên ∫ (1/x) dx = ln|x| + C." },
      { text: "∫ cos x dx bằng:", options: ["sin x + C", "−sin x + C", "cos x + C", "−cos x + C"], correct: 0,
        explanation: "(sin x)' = cos x, nên ∫ cos x dx = sin x + C." },
      { text: "Biết F(x) là một nguyên hàm của f(x) = 2x và F(1) = 3. Khi đó F(x) là:", options: ["x² + 2", "x² + 3", "2x² + 1", "x² − 2"], correct: 0,
        explanation: "F(x) = x² + C. Từ F(1) = 1 + C = 3 suy ra C = 2, vậy F(x) = x² + 2." },
      { text: "∫ (2x + 1) dx bằng:", options: ["x² + x + C", "2x² + x + C", "x² + C", "2 + C"], correct: 0,
        explanation: "∫ 2x dx = x² và ∫ 1 dx = x, cộng lại được x² + x + C." },
    ],
  },
  {
    key: "quiz-toan10-menh-de",
    title: "Mệnh đề và tập hợp",
    description: "5 câu nhận biết mệnh đề, phủ định và phép toán trên tập hợp.",
    chapter: "toan10-c1",
    durationMinutes: 8,
    isPublished: true,
    questions: [
      { text: "Câu nào sau đây là một mệnh đề?", options: ["Số 7 là số nguyên tố.", "Hôm nay trời đẹp quá!", "x + 1 = 3", "Bạn có đi học không?"], correct: 0,
        explanation: "Mệnh đề là câu khẳng định có tính đúng hoặc sai xác định. Câu cảm thán, câu hỏi và câu chứa biến chưa xác định giá trị không phải mệnh đề." },
      { text: "Phủ định của mệnh đề “∀x ∈ ℝ, x² ≥ 0” là:", options: ["∃x ∈ ℝ, x² < 0", "∀x ∈ ℝ, x² < 0", "∃x ∈ ℝ, x² ≥ 0", "∀x ∈ ℝ, x² ≤ 0"], correct: 0,
        explanation: "Phủ định của “∀x, P(x)” là “∃x, P(x) sai”. Phủ định của x² ≥ 0 là x² < 0." },
      { text: "Cho A = {1; 2; 3; 4} và B = {3; 4; 5}. Tập A ∩ B là:", options: ["{3; 4}", "{1; 2; 3; 4; 5}", "{1; 2}", "{5}"], correct: 0,
        explanation: "A ∩ B gồm các phần tử vừa thuộc A vừa thuộc B: 3 và 4." },
      { text: "Với A, B như câu trên, tập A \\ B là:", options: ["{1; 2}", "{5}", "{3; 4}", "∅"], correct: 0,
        explanation: "A \\ B gồm các phần tử thuộc A nhưng không thuộc B: 1 và 2." },
      { text: "Tập {a; b; c} có bao nhiêu tập con?", options: ["8", "6", "3", "9"], correct: 0,
        explanation: "Tập có n phần tử có 2ⁿ tập con. Với n = 3: 2³ = 8 (kể cả ∅ và chính nó)." },
    ],
  },
  {
    key: "quiz-ly10-bien-doi-deu",
    title: "Chuyển động thẳng biến đổi đều",
    description: "6 câu vận dụng công thức vận tốc, độ dịch chuyển và hệ thức độc lập.",
    chapter: "ly10-c2",
    durationMinutes: 12,
    isPublished: true,
    questions: [
      { text: "Công thức vận tốc của chuyển động thẳng biến đổi đều là:", options: ["v = v₀ + at", "v = v₀t + at²/2", "v = at²", "v = 2ad"], correct: 0,
        explanation: "Từ a = Δv/Δt suy ra v = v₀ + at." },
      { text: "Một xe bắt đầu chuyển động nhanh dần đều với gia tốc 2 m/s². Vận tốc của xe sau 5 s là:", options: ["10 m/s", "5 m/s", "25 m/s", "2,5 m/s"], correct: 0,
        explanation: "v₀ = 0, v = at = 2 · 5 = 10 m/s." },
      { text: "Quãng đường xe ở câu trên đi được trong 5 s đầu là:", options: ["25 m", "50 m", "10 m", "12,5 m"], correct: 0,
        explanation: "d = v₀t + at²/2 = 0 + 2 · 5²/2 = 25 m." },
      { text: "Trong chuyển động thẳng chậm dần đều thì:", options: ["a ngược dấu với v", "a cùng dấu với v", "a = 0", "v không đổi"], correct: 0,
        explanation: "Chậm dần đều nghĩa là độ lớn vận tốc giảm đều, khi đó vectơ gia tốc ngược chiều vectơ vận tốc (a·v < 0)." },
      { text: "Ô tô đang chạy 20 m/s thì hãm phanh, chuyển động chậm dần đều với gia tốc có độ lớn 4 m/s². Thời gian đến khi dừng là:", options: ["5 s", "4 s", "80 s", "10 s"], correct: 0,
        explanation: "0 = 20 − 4t ⇒ t = 5 s." },
      { text: "Hệ thức liên hệ giữa vận tốc, gia tốc và độ dịch chuyển (không chứa t) là:", options: ["v² − v₀² = 2ad", "v − v₀ = 2ad", "v² + v₀² = 2ad", "v² − v₀² = ad"], correct: 0,
        explanation: "Khử t từ v = v₀ + at và d = v₀t + at²/2 ta được v² − v₀² = 2ad." },
    ],
  },
  {
    key: "quiz-hoa10-nguyen-tu",
    title: "Cấu tạo nguyên tử",
    description: "5 câu về thành phần nguyên tử, số khối, đồng vị và cấu hình electron.",
    chapter: "hoa10-c1",
    durationMinutes: 8,
    isPublished: true,
    questions: [
      { text: "Hạt mang điện tích dương trong hạt nhân nguyên tử là:", options: ["Proton", "Electron", "Neutron", "Ion"], correct: 0,
        explanation: "Hạt nhân gồm proton (điện tích +1) và neutron (không mang điện). Electron ở lớp vỏ, mang điện −1." },
      { text: "Nguyên tử có Z = 11 thì có bao nhiêu electron?", options: ["11", "12", "10", "23"], correct: 0,
        explanation: "Nguyên tử trung hòa điện: số electron = số proton = Z = 11." },
      { text: "Nguyên tử sodium có Z = 11 và số khối A = 23. Số neutron là:", options: ["12", "11", "23", "34"], correct: 0,
        explanation: "N = A − Z = 23 − 11 = 12." },
      { text: "Cấu hình electron của nguyên tử oxygen (Z = 8) là:", options: ["1s² 2s² 2p⁴", "1s² 2s² 2p⁶", "1s² 2s² 2p³ 3s¹", "1s² 2p⁶"], correct: 0,
        explanation: "Điền 8 electron theo thứ tự 1s → 2s → 2p: 1s² 2s² 2p⁴." },
      { text: "Đồng vị là những nguyên tử có cùng:", options: ["Số proton nhưng khác số neutron", "Số khối", "Số neutron nhưng khác số proton", "Số neutron và số khối"], correct: 0,
        explanation: "Các đồng vị của một nguyên tố có cùng Z (số proton), khác N nên khác số khối A." },
    ],
  },
  {
    key: "quiz-anh11-tenses",
    title: "Present perfect vs Past simple",
    description: "5 câu chọn thì đúng dựa vào dấu hiệu thời gian.",
    chapter: "anh11-g1",
    durationMinutes: 6,
    isPublished: true,
    questions: [
      { text: "She ___ in Hanoi since 2018.", options: ["has lived", "lived", "lives", "is living"], correct: 0,
        explanation: "“since + mốc thời gian” diễn tả hành động bắt đầu trong quá khứ và kéo dài đến hiện tại → hiện tại hoàn thành: has lived." },
      { text: "I ___ my homework yesterday.", options: ["did", "have done", "do", "has done"], correct: 0,
        explanation: "“yesterday” là thời điểm xác định trong quá khứ → quá khứ đơn: did." },
      { text: "___ you ever ___ to Da Lat?", options: ["Have / been", "Did / go", "Do / go", "Are / going"], correct: 0,
        explanation: "“ever” hỏi về trải nghiệm tính đến hiện tại → Have you ever been to…?" },
      { text: "They ___ the project two days ago.", options: ["finished", "have finished", "finish", "had finish"], correct: 0,
        explanation: "“ago” đi với quá khứ đơn: finished." },
      { text: "We ___ each other for ten years, and we are still best friends.", options: ["have known", "knew", "are knowing", "know"], correct: 0,
        explanation: "“for ten years” + vẫn còn đúng ở hiện tại → hiện tại hoàn thành. “know” là động từ trạng thái nên không dùng dạng tiếp diễn." },
    ],
  },
  {
    key: "quiz-hoa11-ph",
    title: "pH của dung dịch (bản nháp)",
    description: "Đề đang soạn — chưa xuất bản.",
    chapter: "hoa11-c1",
    durationMinutes: 5,
    isPublished: false,
    questions: [
      { text: "Dung dịch HCl 0,01 M có pH bằng:", options: ["2", "1", "12", "0,01"], correct: 0,
        explanation: "HCl là acid mạnh nên [H⁺] = 0,01 = 10⁻² M ⇒ pH = −lg[H⁺] = 2." },
      { text: "Dung dịch có pH = 9 có môi trường:", options: ["Base", "Acid", "Trung tính", "Không xác định"], correct: 0,
        explanation: "Ở 25 °C, pH > 7 là môi trường base." },
    ],
  },
];

export function buildSeedQuizzes(): { quizzes: Quiz[]; questions: Question[] } {
  const quizzes: Quiz[] = [];
  const questions: Question[] = [];
  const createdAt = toIso("2026-11-15");
  for (const q of quizSeeds) {
    const chapter = chapters.find((c) => c.id === seedId(q.chapter));
    if (!chapter) throw new Error(`Seed: không tìm thấy chương ${q.chapter}`);
    const quizId = seedId(q.key);
    quizzes.push({
      id: quizId,
      title: q.title,
      description: q.description,
      gradeId: chapter.gradeId,
      subjectId: chapter.subjectId,
      chapterId: chapter.id,
      durationMinutes: q.durationMinutes,
      isPublished: q.isPublished,
      createdAt,
      updatedAt: createdAt,
    });
    q.questions.forEach((qs, qi) => {
      const qid = seedId(`${q.key}:q${qi}`);
      // Đảo vị trí đáp án đúng theo câu để đáp án không luôn là A.
      const shift = qi % qs.options.length;
      const rotated = qs.options.map((_, i) => (i + shift) % qs.options.length);
      questions.push({
        id: qid,
        quizId,
        text: qs.text,
        explanation: qs.explanation,
        order: qi + 1,
        options: rotated.map((src, oi) => ({
          id: seedId(`${q.key}:q${qi}:o${oi}`),
          text: qs.options[src],
          isCorrect: src === qs.correct,
        })),
      });
    });
  }
  return { quizzes, questions };
}

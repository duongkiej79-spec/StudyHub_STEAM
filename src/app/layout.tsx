import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "StudyHub — Thư viện tài liệu & luyện trắc nghiệm THPT",
    template: "%s · StudyHub",
  },
  description:
    "Tìm tài liệu theo lớp, môn, chương, bài; xem và tải PDF miễn phí; luyện trắc nghiệm có chấm điểm và lời giải cho học sinh lớp 10, 11, 12.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f54e0",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnam.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}

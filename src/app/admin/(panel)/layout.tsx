import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site-chrome";
import { requireAdmin } from "@/lib/auth";
import { logoutAction } from "../actions";

export const metadata: Metadata = { title: { default: "Quản trị", template: "%s · Quản trị StudyHub" }, robots: { index: false } };
export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/tai-lieu", label: "Tài liệu" },
  { href: "/admin/de-thi", label: "Đề & câu hỏi" },
  { href: "/admin/phan-loai", label: "Phân loại" },
  { href: "/admin/bao-loi", label: "Báo lỗi" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();
  return (
    <div className="flex min-h-full flex-1 flex-col bg-surface">
      <header className="border-b border-line bg-white">
        <div className="container-page flex flex-wrap items-center justify-between gap-3 py-3">
          <div className="flex items-center gap-3">
            <Logo href="/admin" />
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Quản trị</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-muted sm:inline">{admin.email}</span>
            <Link href="/" className="text-muted hover:text-ink">Xem trang học sinh</Link>
            <form action={logoutAction}>
              <button type="submit" className="btn-secondary py-1.5">Đăng xuất</button>
            </form>
          </div>
        </div>
        <nav aria-label="Quản trị" className="container-page flex gap-1 overflow-x-auto pb-2 text-sm font-medium">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-2 text-muted hover:bg-surface hover:text-ink">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="container-page flex-1 py-6">{children}</main>
    </div>
  );
}

import Link from "next/link";
import { Logo } from "@/components/site-chrome";

export default function NotFound() {
  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
      <Logo />
      <p className="mt-8 text-6xl font-bold text-brand-600">404</p>
      <h1 className="mt-2 text-xl font-semibold text-ink">Không tìm thấy trang</h1>
      <p className="mt-2 max-w-md text-muted">
        Liên kết có thể đã bị đổi, tài liệu đã bị ẩn, hoặc bạn gõ sai địa chỉ.
      </p>
      <div className="mt-6 flex gap-2">
        <Link href="/" className="btn-primary">Về trang chủ</Link>
        <Link href="/tim-kiem" className="btn-secondary">Tìm tài liệu</Link>
      </div>
    </main>
  );
}

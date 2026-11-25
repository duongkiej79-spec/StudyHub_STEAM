
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/account-forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/validation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng nhập",
  robots: { index: false },
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/dang-nhap">) {
  const next = safeNext((await searchParams).next);

  if (await getCurrentUser()) {
    redirect(next);
  }

  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-ink">
          Đăng nhập
        </h1>

        <p className="mt-1 mb-6 text-sm text-muted">
          Để lưu tài liệu yêu thích, lịch sử và tiến độ
          luyện tập. Đọc tài liệu và làm bài không cần
          đăng nhập.
        </p>

        <LoginForm next={next} />

        {/* Liên kết khôi phục mật khẩu */}
        <div className="mt-4 text-center">
          <Link
            href="/quen-mat-khau"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
      </div>
    </div>
  );
}

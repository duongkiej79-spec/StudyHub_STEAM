import { requestPasswordReset } from "./actions";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Quên mật khẩu
        </h1>

        <p className="mb-6 text-gray-600">
          Nhập email đã đăng ký StudyHub để nhận
          hướng dẫn đặt lại mật khẩu.
        </p>

        <form action={requestPasswordReset} className="space-y-4">
          <input
            type="email"
            name="email"
            placeholder="Nhập email của bạn"
            autoComplete="email"
            required
            className="w-full rounded-lg border p-3 text-gray-900"
          />

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
          >
            Gửi email khôi phục
          </button>
        </form>

        <Link
          href="/dang-nhap"
          className="mt-5 block text-center text-blue-600"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}

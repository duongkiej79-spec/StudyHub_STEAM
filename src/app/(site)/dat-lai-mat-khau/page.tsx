
import Link from "next/link";
import { updatePassword } from "./actions";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const errorMessage =
    error === "short"
      ? "Mật khẩu phải có ít nhất 8 ký tự."
      : error === "mismatch"
        ? "Hai mật khẩu không khớp."
        : error
          ? "Không thể đổi mật khẩu. Hãy thử lại."
          : null;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Đặt lại mật khẩu
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Nhập mật khẩu mới cho tài khoản StudyHub.
        </p>

        {errorMessage && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        )}

        <form action={updatePassword} className="space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium"
            >
              Mật khẩu mới
            </label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border p-3 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1 block text-sm font-medium"
            >
              Xác nhận mật khẩu mới
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border p-3 text-gray-900"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
          >
            Lưu mật khẩu mới
          </button>
        </form>

        <Link
          href="/dang-nhap"
          className="mt-5 block text-center text-sm text-blue-600"
        >
          Quay lại đăng nhập
        </Link>
      </div>
    </main>
  );
}

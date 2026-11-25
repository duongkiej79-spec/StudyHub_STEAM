
import Link from "next/link";
import { confirmRecovery } from "./actions";

export default async function RecoveryConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{
    token_hash?: string;
  }>;
}) {
  const { token_hash } = await searchParams;

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <div className="rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="mb-3 text-2xl font-bold text-gray-900">
          Xác nhận khôi phục mật khẩu
        </h1>

        <p className="mb-6 text-sm text-gray-600">
          Nếu bạn vừa yêu cầu đặt lại mật khẩu StudyHub,
          hãy nhấn nút bên dưới để tiếp tục.
        </p>

        {token_hash ? (
          <form action={confirmRecovery}>
            <input
              type="hidden"
              name="token_hash"
              value={token_hash}
            />

            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 p-3 font-semibold text-white"
            >
              Tiếp tục đặt lại mật khẩu
            </button>
          </form>
        ) : (
          <div>
            <p className="mb-4 text-sm text-red-600">
              Liên kết không hợp lệ hoặc thiếu mã xác minh.
            </p>

            <Link
              href="/quen-mat-khau"
              className="text-sm font-medium text-blue-600"
            >
              Yêu cầu liên kết mới
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}

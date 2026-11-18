"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="container-page flex flex-1 flex-col items-center justify-center py-20 text-center">
      <h1 className="text-xl font-semibold text-ink">Đã có lỗi xảy ra</h1>
      <p className="mt-2 max-w-md text-muted">
        Hệ thống tạm thời không xử lý được yêu cầu. Bạn thử tải lại trang nhé.
        {error.digest && <span className="mt-1 block text-xs">Mã lỗi: {error.digest}</span>}
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className="btn-primary">Thử lại</button>
        <Link href="/" className="btn-secondary">Về trang chủ</Link>
      </div>
    </main>
  );
}

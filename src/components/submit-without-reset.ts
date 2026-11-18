"use client";

import { startTransition } from "react";

/**
 * React 19 tự xóa trắng form sau khi server action chạy xong — kể cả khi server báo lỗi
 * kiểm tra dữ liệu, khiến người nhập mất hết nội dung. Dùng làm `onSubmit` để gửi form
 * mà KHÔNG reset (vẫn giữ `action={...}` để form hoạt động khi chưa tải JavaScript).
 * Nút submit được bấm (ví dụ name="intent") vẫn được gửi kèm.
 */
export function submitWithoutReset(dispatch: (fd: FormData) => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const fd = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(fd));
  };
}

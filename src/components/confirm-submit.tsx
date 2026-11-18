"use client";

/** Nút submit hỏi xác nhận trước (dùng cho thao tác xóa không hoàn tác được). */
export function ConfirmSubmit({ message, children, className = "btn-danger" }: { message: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toggleFavoriteAction } from "@/app/(site)/account-actions";

/** Lưu / bỏ lưu tài liệu yêu thích (P1). Khách thấy lời mời đăng nhập. */
export function FavoriteButton({ documentId, initial, loggedIn }: { documentId: string; initial: boolean; loggedIn: boolean }) {
  const [pending, startTransition] = useTransition();
  const [fav, setFav] = useOptimistic(initial);

  if (!loggedIn) {
    return (
      <Link href={`/dang-nhap?next=${encodeURIComponent(`/tai-lieu/${documentId}`)}`} className="btn-secondary">
        ☆ Đăng nhập để lưu
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={fav}
      disabled={pending}
      className={fav ? "btn border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100" : "btn-secondary"}
      onClick={() =>
        startTransition(async () => {
          setFav(!fav);
          await toggleFavoriteAction(documentId, !fav);
        })
      }
    >
      {fav ? "★ Đã lưu" : "☆ Lưu yêu thích"}
    </button>
  );
}

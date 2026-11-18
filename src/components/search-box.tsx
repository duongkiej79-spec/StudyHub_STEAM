"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { id: string; title: string; meta: string };

/**
 * Ô tìm kiếm có gợi ý (F02). Gõ có dấu hoặc không dấu đều được.
 * Gợi ý lấy từ /api/goi-y, có debounce 200ms; điều hướng được bằng phím mũi tên.
 */
export function SearchBox({
  defaultValue = "",
  size = "md",
  autoFocus = false,
}: {
  defaultValue?: string;
  size?: "md" | "lg";
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/goi-y?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setItems(await res.json());
          setActive(-1);
        }
      } catch {
        /* bỏ qua khi người dùng gõ tiếp */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    if (active >= 0 && items[active]) {
      router.push(`/tai-lieu/${items[active].id}`);
      return;
    }
    const term = q.trim();
    router.push(term ? `/tim-kiem?q=${encodeURIComponent(term)}` : "/tim-kiem");
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || !items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? items.length - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const big = size === "lg";
  // Gợi ý cũ không hiển thị khi ô tìm kiếm còn quá ngắn.
  const showList = open && q.trim().length >= 2 && items.length > 0;

  return (
    <div ref={boxRef} className="relative w-full">
      <form role="search" onSubmit={submit} className="flex gap-2">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Tìm tài liệu
        </label>
        <input
          id={`${listId}-input`}
          type="search"
          value={q}
          autoFocus={autoFocus}
          autoComplete="off"
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Tìm tài liệu: nguyen ham, dao dong, bị động…"
          className={`input ${big ? "py-3.5 text-base" : ""}`}
          role="combobox"
          aria-expanded={showList}
          aria-controls={`${listId}-list`}
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
        />
        <button type="submit" className={`btn-primary shrink-0 ${big ? "px-6 text-base" : ""}`}>
          Tìm
        </button>
      </form>
      {showList && (
        <ul
          id={`${listId}-list`}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-line bg-white shadow-lg"
        >
          {items.map((s, i) => (
            <li
              key={s.id}
              id={`${listId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                setOpen(false);
                router.push(`/tai-lieu/${s.id}`);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2.5 text-left ${i === active ? "bg-brand-50" : ""}`}
            >
              <div className="text-sm font-medium text-ink">{s.title}</div>
              <div className="text-xs text-muted">{s.meta}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

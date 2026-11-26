import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-ink" aria-label="StudyHub — Trang chủ">
      <span aria-hidden className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm text-white">
        SH
      </span>
      <span className="hidden text-lg tracking-tight min-[400px]:inline">StudyHub</span>
    </Link>
  );
}

const NAV = [
  { href: "/thu-vien", label: "Thư viện", mobile: true },
  { href: "/tim-kiem", label: "Tìm kiếm", mobile: false }, // điện thoại: dùng ô tìm kiếm ở trang chủ
  { href: "/luyen-tap", label: "Luyện tập", mobile: true },
  { href: "/hoc-ai", label: "✦ Học cùng AI", mobile: true },
];

/** `user`: người đang đăng nhập (null = khách). Layout lấy sẵn và truyền vào. */
export function SiteHeader({ user }: { user: { displayName: string } | null }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-2">
        <Logo />
        <nav aria-label="Điều hướng chính" className="flex items-center text-sm font-medium sm:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${n.mobile ? "" : "hidden sm:inline-block"} whitespace-nowrap rounded-lg px-2 py-2 text-muted hover:bg-surface hover:text-ink sm:px-3`}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <Link href="/tai-khoan" className="ml-1 flex items-center gap-2 rounded-lg py-1 pl-1 pr-1 hover:bg-surface sm:pr-3" aria-label={`Tài khoản của ${user.displayName}`}>
              <span aria-hidden className="grid size-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                {user.displayName.trim().charAt(0).toUpperCase() || "?"}
              </span>
              <span className="hidden max-w-32 truncate text-ink md:inline">{user.displayName}</span>
            </Link>
          ) : (
            <Link href="/dang-nhap" className="btn-secondary ml-1 whitespace-nowrap px-3 py-1.5">
              Đăng nhập
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-surface">
      <div className="container-page flex flex-col gap-2 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>StudyHub — Dự án STEAM. Học liệu tự biên soạn hoặc được phép chia sẻ, luôn ghi rõ nguồn.</p>
        <Link href="/admin" className="hover:text-ink">
          Khu vực quản trị
        </Link>
      </div>
    </footer>
  );
}

export function Breadcrumbs({ items }: { items: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Vị trí" className="mb-4 text-sm text-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-1">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink hover:underline">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-ink">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card px-6 py-12 text-center">
      <p className="font-semibold text-ink">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

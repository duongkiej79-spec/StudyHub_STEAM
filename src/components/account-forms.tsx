"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type AccountFormState } from "@/app/(site)/account-actions";
import { submitWithoutReset } from "./submit-without-reset";

function Err({ msg }: { msg?: string }) {
  return msg ? <p className="mt-1 text-sm text-rose-700">{msg}</p> : null;
}

function Banner({ state }: { state: AccountFormState }) {
  if (!state.message) return null;
  return (
    <p className={`rounded-lg px-3 py-2 text-sm ${state.ok ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`} role={state.ok ? "status" : "alert"}>
      {state.message}
    </p>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(loginAction, {});
  const e = state.errors ?? {};
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="login-email" className="label">Email</label>
        <input id="login-email" name="email" type="email" autoComplete="email" required className="input" />
        <Err msg={e.email} />
      </div>
      <div>
        <label htmlFor="login-password" className="label">Mật khẩu</label>
        <input id="login-password" name="password" type="password" autoComplete="current-password" required className="input" />
        <Err msg={e.password} />
      </div>
      <Banner state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Đang đăng nhập…" : "Đăng nhập"}</button>
      <p className="text-center text-sm text-muted">
        Chưa có tài khoản?{" "}
        <Link href={`/dang-ky?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline">Đăng ký</Link>
      </p>
    </form>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(registerAction, {});
  const e = state.errors ?? {};
  if (state.ok) return <Banner state={state} />;
  return (
    <form action={action} onSubmit={submitWithoutReset(action)} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div>
        <label htmlFor="reg-name" className="label">Tên hiển thị</label>
        <input id="reg-name" name="displayName" autoComplete="nickname" required minLength={2} maxLength={60} className="input" placeholder="Ví dụ: Minh Anh" />
        <p className="mt-1 text-xs text-muted">Không cần họ tên đầy đủ — biệt danh là đủ.</p>
        <Err msg={e.displayName} />
      </div>
      <div>
        <label htmlFor="reg-email" className="label">Email</label>
        <input id="reg-email" name="email" type="email" autoComplete="email" required className="input" />
        <Err msg={e.email} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="reg-password" className="label">Mật khẩu</label>
          <input id="reg-password" name="password" type="password" autoComplete="new-password" required minLength={8} maxLength={72} className="input" />
          <Err msg={e.password} />
        </div>
        <div>
          <label htmlFor="reg-confirm" className="label">Nhập lại mật khẩu</label>
          <input id="reg-confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
          <Err msg={e.confirm} />
        </div>
      </div>
      <div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="agree" className="mt-0.5 accent-brand-600" />
          <span>
            Tôi đồng ý để StudyHub lưu email, tên hiển thị, tài liệu yêu thích và kết quả luyện tập của tôi. Kết quả chỉ mình tôi xem được.
          </span>
        </label>
        <Err msg={e.agree} />
      </div>
      <Banner state={state} />
      <button type="submit" disabled={pending} className="btn-primary w-full">{pending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</button>
      <p className="text-center text-sm text-muted">
        Đã có tài khoản?{" "}
        <Link href={`/dang-nhap?next=${encodeURIComponent(next)}`} className="font-medium text-brand-700 hover:underline">Đăng nhập</Link>
      </p>
    </form>
  );
}

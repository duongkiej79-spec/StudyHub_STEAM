import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getBackend, requireEnv } from "../config";
import { localUsers } from "../repo/local";
import { createSupabaseServerClient } from "../supabase/server";
import type { AppUser } from "../types";
import {
  ADMIN_COOKIE,
  ADMIN_TTL_SECONDS,
  DUMMY_HASH,
  USER_COOKIE,
  USER_TTL_SECONDS,
  hashPassword,
  safeEqual,
  signSession,
  verifyPassword,
  verifySession,
} from "./session";

export interface AdminUser {
  id: string;
  email: string;
}

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

// =====================================================================
// Người dùng (học sinh; với Supabase admin cũng là một người dùng)
// =====================================================================

/** Người dùng đang đăng nhập ở request hiện tại, hoặc null (khách). */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    // getUser() xác thực JWT với máy chủ Auth (không tin cookie mù quáng).
    const { data } = await sb.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await sb.from("profiles").select("role, display_name").eq("id", data.user.id).maybeSingle();
    const email = data.user.email ?? "";
    return {
      id: data.user.id,
      email,
      displayName: profile?.display_name || email.split("@")[0],
      role: profile?.role === "admin" ? "admin" : "student",
    };
  }
  const p = verifySession((await cookies()).get(USER_COOKIE)?.value, "user");
  if (!p) return null;
  const u = await localUsers.findById(p.sub); // tài khoản có thể đã bị xóa
  return u ? { id: u.id, email: u.email, displayName: u.displayName, role: "student" } : null;
});

/** Dùng ở trang/action cần đăng nhập; chuyển về trang đăng nhập rồi quay lại `next`. */
export async function requireUser(next: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(next)}`);
  return user;
}

export type RegisterResult = { ok: true; needsConfirmation: boolean } | { ok: false; error: string };

export async function registerStudent(input: { email: string; password: string; displayName: string }): Promise<RegisterResult> {
  const email = input.email.trim().toLowerCase();
  if (await isLocked("register")) return { ok: false, error: "Bạn thao tác quá nhiều lần. Vui lòng thử lại sau 5 phút." };
  await recordFailure("register"); // đếm mọi lần đăng ký để chặn tạo tài khoản hàng loạt

  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.auth.signUp({
      email,
      password: input.password,
      options: { data: { display_name: input.displayName } },
    });
    if (error) {
      return { ok: false, error: /registered|exists/i.test(error.message) ? "Email này đã được đăng ký." : "Không tạo được tài khoản. Vui lòng thử lại." };
    }
    // Nếu project bật xác nhận email, Supabase chưa trả phiên đăng nhập.
    return { ok: true, needsConfirmation: !data.session };
  }

  const user = await localUsers.create({ email, displayName: input.displayName, passwordHash: await hashPassword(input.password) });
  if (!user) return { ok: false, error: "Email này đã được đăng ký." };
  await setUserCookie(user.id, user.email);
  return { ok: true, needsConfirmation: false };
}

export async function signInStudent(email: string, password: string): Promise<string | null> {
  if (await isLocked("login")) return "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.";
  const normalized = email.trim().toLowerCase();
  let ok = false;

  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.auth.signInWithPassword({ email: normalized, password });
    ok = !error && !!data.user;
  } else {
    const user = await localUsers.findByEmail(normalized);
    // Luôn chạy scrypt để thời gian phản hồi như nhau dù email có tồn tại hay không.
    const valid = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
    if (user && valid) {
      await setUserCookie(user.id, user.email);
      ok = true;
    }
  }

  if (!ok) {
    await recordFailure("login");
    await new Promise((r) => setTimeout(r, 400));
    return "Email hoặc mật khẩu không đúng.";
  }
  await clearFailures("login");
  return null;
}

export async function signOutStudent(): Promise<void> {
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    await sb.auth.signOut();
    return;
  }
  (await cookies()).delete(USER_COOKIE);
}

async function setUserCookie(id: string, email: string) {
  (await cookies()).set(
    USER_COOKIE,
    signSession({ kind: "user", sub: id, email, exp: Math.floor(Date.now() / 1000) + USER_TTL_SECONDS }),
    cookieOptions(USER_TTL_SECONDS),
  );
}

// =====================================================================
// Quản trị viên
// =====================================================================

/** Người quản trị của request hiện tại, hoặc null. Kết quả được nhớ trong 1 request. */
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  if (getBackend() === "supabase") {
    const user = await getCurrentUser();
    return user?.role === "admin" ? { id: user.id, email: user.email } : null;
  }
  const p = verifySession((await cookies()).get(ADMIN_COOKIE)?.value, "admin");
  return p ? { id: p.sub, email: p.email } : null;
});

/**
 * Bắt buộc gọi ở ĐẦU mọi trang quản trị và MỌI server action ghi dữ liệu.
 * (proxy.ts chỉ là kiểm tra lạc quan để chuyển hướng sớm.)
 */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function signInAdmin(email: string, password: string): Promise<string | null> {
  if (await isLocked("admin")) return "Bạn đã nhập sai quá nhiều lần. Vui lòng thử lại sau 5 phút.";
  const ok = await attemptAdmin(email.trim().toLowerCase(), password);
  if (!ok) {
    await recordFailure("admin");
    await new Promise((r) => setTimeout(r, 400)); // làm chậm dò mật khẩu
    return "Email hoặc mật khẩu không đúng, hoặc tài khoản không có quyền quản trị.";
  }
  await clearFailures("admin");
  return null;
}

async function attemptAdmin(email: string, password: string): Promise<boolean> {
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.user) return false;
    const { data: profile } = await sb.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "admin") {
      await sb.auth.signOut();
      return false;
    }
    return true;
  }

  const expectedEmail = requireEnv("ADMIN_EMAIL").trim().toLowerCase();
  const expectedPassword = requireEnv("ADMIN_PASSWORD");
  // Tính cả hai phép so sánh để thời gian phản hồi không phụ thuộc email đúng/sai.
  const emailOk = safeEqual(email, expectedEmail);
  const passOk = safeEqual(password, expectedPassword);
  if (!emailOk || !passOk) return false;

  (await cookies()).set(
    ADMIN_COOKIE,
    signSession({ kind: "admin", sub: "local-admin", email, exp: Math.floor(Date.now() / 1000) + ADMIN_TTL_SECONDS }),
    cookieOptions(ADMIN_TTL_SECONDS),
  );
  return true;
}

export async function signOutAdmin(): Promise<void> {
  if (getBackend() === "supabase") {
    const sb = await createSupabaseServerClient();
    await sb.auth.signOut();
    return;
  }
  (await cookies()).delete(ADMIN_COOKIE);
}

// =====================================================================
// Giới hạn số lần thử (trong bộ nhớ tiến trình — đủ cho 1 máy chủ demo)
// =====================================================================
type Scope = "admin" | "login" | "register";
// Tính theo IP: cả lớp dùng chung Wi-Fi trường vẫn đủ dư cho buổi demo.
const LIMITS: Record<Scope, number> = { admin: 5, login: 10, register: 10 };
const LOCK_MS = 5 * 60 * 1000;
const attempts = new Map<string, { count: number; until: number }>();

async function keyFor(scope: Scope): Promise<string> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "local").trim();
  return `${scope}:${ip}`;
}

async function isLocked(scope: Scope): Promise<boolean> {
  const f = attempts.get(await keyFor(scope));
  return !!f && f.count >= LIMITS[scope] && f.until > Date.now();
}

async function recordFailure(scope: Scope) {
  const key = await keyFor(scope);
  const f = attempts.get(key);
  attempts.set(key, { count: (f && f.until > Date.now() ? f.count : 0) + 1, until: Date.now() + LOCK_MS });
}

async function clearFailures(scope: Scope) {
  attempts.delete(await keyFor(scope));
}

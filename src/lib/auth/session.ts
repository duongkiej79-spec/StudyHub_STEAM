import "server-only";
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { requireEnv } from "../config";

/**
 * Phiên đăng nhập ở chế độ local: cookie "payload.chữ_ký" ký bằng HMAC-SHA256.
 * Hai loại phiên dùng chung secret nhưng có trường `kind` riêng và được kiểm tra khi đọc,
 * nên không thể chép token học sinh sang cookie quản trị để leo quyền.
 */
export const ADMIN_COOKIE = "sh_admin";
export const USER_COOKIE = "sh_user";
export const ADMIN_TTL_SECONDS = 8 * 60 * 60;
export const USER_TTL_SECONDS = 30 * 24 * 60 * 60;

export type SessionKind = "admin" | "user";

export interface SessionPayload {
  kind: SessionKind;
  sub: string;
  email: string;
  exp: number; // epoch giây
}

function secret(): string {
  const s = requireEnv("SESSION_SECRET");
  if (s.length < 32) throw new Error("SESSION_SECRET phải dài ít nhất 32 ký tự");
  return s;
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

export function signSession(payload: SessionPayload): string {
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined, kind: SessionKind): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", secret()).update(body).digest();
  const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (p.kind !== kind) return null;
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    return p;
  } catch {
    return null;
  }
}

/** So sánh chuỗi bí mật trong thời gian hằng (không lộ độ dài/khớp một phần). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

// ---- Băm mật khẩu học sinh (scrypt, muối ngẫu nhiên 16 byte) ----
const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number, opts: { N: number; r: number; p: number }) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1 };

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, 32, SCRYPT);
  return `scrypt$${SCRYPT.N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64url");
  const key = await scryptAsync(password, Buffer.from(saltB64, "base64url"), expected.length, { ...SCRYPT, N: Number(n) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Băm giả để thời gian phản hồi như nhau khi email không tồn tại. */
export const DUMMY_HASH = "scrypt$16384$AAAAAAAAAAAAAAAAAAAAAA$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA";

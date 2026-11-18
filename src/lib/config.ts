import "server-only";

export type Backend = "local" | "supabase";

/**
 * DATA_BACKEND=local    → dữ liệu trong .data/db.json, tệp trong storage/ (chạy ngay, dùng khi phát triển/demo trên máy)
 * DATA_BACKEND=supabase → PostgreSQL + Auth + Storage của Supabase (dùng khi triển khai)
 */
export function getBackend(): Backend {
  const v = (process.env.DATA_BACKEND ?? "local").trim();
  if (v !== "local" && v !== "supabase") {
    throw new Error(`DATA_BACKEND không hợp lệ: "${v}" (chỉ nhận "local" hoặc "supabase")`);
  }
  return v;
}

export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Thiếu biến môi trường ${name} — xem .env.example`);
  return v;
}

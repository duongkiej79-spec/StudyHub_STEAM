import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requireEnv } from "../config";

/**
 * Client Supabase gắn với phiên đăng nhập (cookie) của người dùng hiện tại.
 * Chỉ dùng khóa anon/publishable — RLS trong CSDL quyết định quyền.
 * Khóa service_role KHÔNG bao giờ được dùng trong ứng dụng web.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_ANON_KEY"), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Gọi từ Server Component (không ghi được cookie) — proxy.ts sẽ làm mới phiên.
        }
      },
    },
  });
}

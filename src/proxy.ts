import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (trước đây là middleware):
 *  - Supabase: làm mới phiên đăng nhập (ghi lại cookie) trước khi trang chạy — cho cả học sinh lẫn admin.
 *  - /admin: kiểm tra LẠC QUAN, không có phiên → chuyển về trang đăng nhập quản trị.
 * Quyền thật sự vẫn được kiểm tra bởi requireAdmin()/requireUser() trong từng trang và server action.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const supabaseMode = process.env.DATA_BACKEND === "supabase" && !!process.env.SUPABASE_URL && !!process.env.SUPABASE_ANON_KEY;

  // Chế độ local, ngoài khu quản trị: không cần làm gì.
  if (!supabaseMode && !isAdminArea) return NextResponse.next();

  let response = NextResponse.next({ request });
  let hasAdminSession = false;

  if (supabaseMode) {
    const sb = createServerClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });
    const { data } = await sb.auth.getUser();
    hasAdminSession = !!data.user;
  } else {
    hasAdminSession = request.cookies.has("sh_admin");
  }

  if (isAdminArea) {
    if (!hasAdminSession && pathname !== "/admin/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/login";
      url.search = "";
      return NextResponse.redirect(url);
    }
    // Trang quản trị không được lưu đệm ở trình duyệt/CDN.
    response.headers.set("Cache-Control", "no-store");
  }
  return response;
}

export const config = {
  // Bỏ qua tệp tĩnh; vẫn chạy cho trang, server action và route API.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs).*)"],
};

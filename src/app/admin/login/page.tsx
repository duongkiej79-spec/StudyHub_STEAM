import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/site-chrome";
import { getCurrentAdmin } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Đăng nhập quản trị", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");
  return (
    <main className="flex flex-1 items-center justify-center bg-surface px-4 py-16">
      <div className="card w-full max-w-sm p-6 shadow-sm">
        <Logo />
        <h1 className="mt-6 text-xl font-bold text-ink">Đăng nhập quản trị</h1>
        <p className="mt-1 text-sm text-muted">Dành cho quản trị viên / biên tập nội dung.</p>
        <LoginForm />
      </div>
    </main>
  );
}

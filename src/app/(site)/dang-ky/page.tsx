import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account-forms";
import { getCurrentUser } from "@/lib/auth";
import { safeNext } from "@/lib/validation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tạo tài khoản", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/dang-ky">) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);
  return (
    <div className="container-page flex justify-center py-12">
      <div className="card w-full max-w-lg p-6">
        <h1 className="text-xl font-bold text-ink">Tạo tài khoản học sinh</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Miễn phí. Chỉ cần email và một tên hiển thị.</p>
        <RegisterForm next={next} />
      </div>
    </div>
  );
}

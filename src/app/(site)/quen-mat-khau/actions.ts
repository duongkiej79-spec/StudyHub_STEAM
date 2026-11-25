
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirect("/quen-mat-khau?error=email");
  }

  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("Chưa cấu hình APP_URL");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    {
      redirectTo:
        `${appUrl.replace(/\/$/, "")}/xac-nhan-khoi-phuc`,
    }
  );

  if (error) {
    console.error("Password recovery:", error.code);
    redirect("/quen-mat-khau?error=send");
  }

  redirect("/quen-mat-khau?sent=1");
}

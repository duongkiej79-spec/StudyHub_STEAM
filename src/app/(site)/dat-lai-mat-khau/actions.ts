
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(
    formData.get("confirmPassword") ?? ""
  );

  if (password.length < 8) {
    redirect("/dat-lai-mat-khau?error=short");
  }

  if (password !== confirmPassword) {
    redirect("/dat-lai-mat-khau?error=mismatch");
  }

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/quen-mat-khau?error=expired");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    console.error("Update password:", error.code);
    redirect("/dat-lai-mat-khau?error=update");
  }

  await supabase.auth.signOut();

  redirect("/dang-nhap?password_reset=success");
}

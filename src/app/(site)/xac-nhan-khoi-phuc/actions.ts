
"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function confirmRecovery(formData: FormData) {
  const tokenHash = String(
    formData.get("token_hash") ?? ""
  );

  if (!tokenHash) {
    redirect("/quen-mat-khau?error=expired");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    console.error("Recovery verification:", error.code);
    redirect("/quen-mat-khau?error=expired");
  }

  redirect("/dat-lai-mat-khau");
}

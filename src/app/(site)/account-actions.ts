"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser, registerStudent, signInStudent, signOutStudent } from "@/lib/auth";
import { getRepo } from "@/lib/repo";
import { fieldErrors, loginFormSchema, registerFormSchema, safeNext, uuid } from "@/lib/validation";

/** Server action cho tài khoản học sinh (F11 — P1). */

export type AccountFormState = { message?: string; ok?: boolean; errors?: Record<string, string> };

export async function registerAction(_prev: AccountFormState, fd: FormData): Promise<AccountFormState> {
  const parsed = registerFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  if (fd.get("agree") !== "on") return { errors: { agree: "Cần đồng ý để tạo tài khoản." } };

  const res = await registerStudent(parsed.data);
  if (!res.ok) return { message: res.error };
  if (res.needsConfirmation) {
    return { ok: true, message: "Đã tạo tài khoản. Mở email để xác nhận, sau đó đăng nhập." };
  }
  redirect(safeNext(fd.get("next")));
}

export async function loginAction(_prev: AccountFormState, fd: FormData): Promise<AccountFormState> {
  const parsed = loginFormSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const error = await signInStudent(parsed.data.email, parsed.data.password);
  if (error) return { message: error };
  redirect(safeNext(fd.get("next")));
}

export async function logoutAction() {
  await signOutStudent();
  redirect("/");
}

/** Bật/tắt yêu thích. Trả về trạng thái mới; khách được yêu cầu đăng nhập. */
export async function toggleFavoriteAction(documentId: string, on: boolean): Promise<{ ok: boolean; favorite?: boolean; needLogin?: boolean }> {
  if (!uuid.safeParse(documentId).success) return { ok: false };
  const user = await getCurrentUser();
  if (!user) return { ok: false, needLogin: true };
  try {
    await getRepo().setFavorite(user.id, documentId, on);
  } catch (e) {
    console.error("toggleFavoriteAction", e);
    return { ok: false };
  }
  refresh();
  return { ok: true, favorite: on };
}

"use server";

import { redirect } from "next/navigation";
import {
  authenticateUser,
  clearSessionCookie,
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth";

export type LoginResult = { ok: true } | { ok: false; error: string };

export async function loginAction(
  _prev: LoginResult | null,
  formData: FormData
): Promise<LoginResult> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");

  if (!email.trim() || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const user = await authenticateUser(email, password);
  if (!user) {
    return { ok: false, error: "Invalid email or password." };
  }

  const token = await createSessionToken(user);
  await setSessionCookie(token);

  const dest = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  redirect(dest);
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

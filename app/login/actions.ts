"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function login(formData: FormData) {
  const password = process.env.SITE_PASSWORD;
  if (!password) {
    throw new Error("SITE_PASSWORD 환경 변수가 설정되어야 합니다.");
  }

  const input = String(formData.get("password") ?? "");
  if (input !== password) {
    throw new Error("비밀번호가 올바르지 않습니다.");
  }

  const token = await sha256Hex(password);
  const store = await cookies();
  store.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  const redirectTo = String(formData.get("redirect") ?? "/");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/");
}

import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, sha256Hex } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // 비밀번호 미설정 시 보호 비활성 (로컬 개발 편의)

  const expected = await sha256Hex(password);
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (token === expected) return NextResponse.next();

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico).*)"],
};

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  constantTimeCompare,
  createSessionCookie,
  getAuthEnv,
} from "../../../../lib/auth";

const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_BASE_URL;

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo =
    (formData.get("redirectTo") as string | null | undefined) ?? "/";

  const authEnv = getAuthEnv();
  const base = BASE_URL ?? request.nextUrl.origin;

  if (!authEnv) {
    const url = new URL("/login", base);
    url.searchParams.set("error", "config");
    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(url);
  }

  const usernameOk = constantTimeCompare(username, authEnv.username);
  const passwordOk = constantTimeCompare(password, authEnv.password);

  if (!usernameOk || !passwordOk) {
    const url = new URL("/login", base);
    url.searchParams.set("error", "1");
    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(url);
  }

  const cookieValue = createSessionCookie(authEnv.username, authEnv.secret);
  const finalPath =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";
  const redirectUrl = new URL(finalPath, base);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: cookieValue,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  constantTimeCompare,
  createSessionCookie,
  getAuthEnv,
} from "../../../../lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const redirectTo =
    (formData.get("redirectTo") as string | null) ?? "/monitorchat";

  const authEnv = getAuthEnv();
  if (!authEnv) {
    const url = new URL("/monitorchat/login", request.nextUrl.origin);
    url.searchParams.set("error", "config");
    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(url);
  }

  const usernameOk = constantTimeCompare(username, authEnv.username);
  const passwordOk = constantTimeCompare(password, authEnv.password);

  if (!usernameOk || !passwordOk) {
    const url = new URL("/monitorchat/login", request.nextUrl.origin);
    url.searchParams.set("error", "1");
    if (redirectTo) {
      url.searchParams.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(url);
  }

  const cookieValue = createSessionCookie(authEnv.username, authEnv.secret);
  const redirectUrl = new URL(
    redirectTo && redirectTo.startsWith("/monitorchat")
      ? redirectTo
      : "/monitorchat",
    request.nextUrl.origin,
  );

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

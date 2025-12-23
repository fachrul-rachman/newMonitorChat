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
  const redirectTo = (formData.get("redirectTo") as string | null) ?? "/";

  const authEnv = getAuthEnv();
  if (!authEnv) {
    const params = new URLSearchParams();
    params.set("error", "config");
    if (redirectTo) {
      params.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(`/login?${params.toString()}`);
  }

  const usernameOk = constantTimeCompare(username, authEnv.username);
  const passwordOk = constantTimeCompare(password, authEnv.password);

  if (!usernameOk || !passwordOk) {
    const params = new URLSearchParams();
    params.set("error", "1");
    if (redirectTo) {
      params.set("redirectTo", redirectTo);
    }
    return NextResponse.redirect(`/login?${params.toString()}`);
  }

  const cookieValue = createSessionCookie(authEnv.username, authEnv.secret);
  const finalPath =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";

  const response = NextResponse.redirect(finalPath);
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

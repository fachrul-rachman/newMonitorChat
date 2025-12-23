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
    (formData.get("redirectTo") as string | null | undefined) ?? "/";

  const authEnv = getAuthEnv();

  // Gunakan URL request sekarang hanya sebagai "dummy" agar NextResponse.redirect menerima URL absolut,
  // lalu override header Location ke path relatif supaya domain selalu mengikuti host yang diakses user.
  const makeRedirectResponse = (path: string) => {
    const response = NextResponse.redirect(request.url);
    response.headers.set("Location", path);
    return response;
  };

  if (!authEnv) {
    const params = new URLSearchParams();
    params.set("error", "config");
    if (redirectTo) {
      params.set("redirectTo", redirectTo);
    }
    return makeRedirectResponse(`/login?${params.toString()}`);
  }

  const usernameOk = constantTimeCompare(username, authEnv.username);
  const passwordOk = constantTimeCompare(password, authEnv.password);

  if (!usernameOk || !passwordOk) {
    const params = new URLSearchParams();
    params.set("error", "1");
    if (redirectTo) {
      params.set("redirectTo", redirectTo);
    }
    return makeRedirectResponse(`/login?${params.toString()}`);
  }

  const cookieValue = createSessionCookie(authEnv.username, authEnv.secret);
  const finalPath =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/";

  const response = makeRedirectResponse(finalPath);
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

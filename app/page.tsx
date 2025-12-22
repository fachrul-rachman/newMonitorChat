import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  getAuthEnv,
  verifySessionCookie,
} from "../lib/auth";

export default async function Home() {
  const authEnv = getAuthEnv();

  // Jika auth belum dikonfigurasi, langsung ke dashboard monitorchat
  if (!authEnv) {
    redirect("/monitorchat");
  }

  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;

  if (token && verifySessionCookie(token, authEnv.secret)) {
    redirect("/monitorchat");
  }

  redirect("/monitorchat/login?redirectTo=/monitorchat");
}

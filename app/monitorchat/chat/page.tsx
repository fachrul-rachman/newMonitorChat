import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import ChatShell from "./shell";
import {
  SESSION_COOKIE_NAME,
  getAuthEnv,
  verifySessionCookie,
} from "../../../lib/auth";

export default async function ChatPage() {
  const authEnv = getAuthEnv();

  if (authEnv) {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE_NAME)?.value;

    if (!token || !verifySessionCookie(token, authEnv.secret)) {
      redirect("/login?redirectTo=/chat");
    }
  }

  return (
    <div className="chat-page">
      <ChatShell />
    </div>
  );
}

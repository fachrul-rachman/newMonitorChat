import type { ReactNode } from "react";
import Link from "next/link";

export default function MonitorChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-900 px-2 py-1 text-xs font-semibold text-white">
              Internal
            </span>
            <h1 className="text-lg font-semibold">Monitoring Chat</h1>
          </div>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/monitorchat"
              className="rounded px-2 py-1 hover:bg-zinc-100"
            >
              Dashboard
            </Link>
            <Link
              href="/monitorchat/chat"
              className="rounded px-2 py-1 hover:bg-zinc-100"
            >
              Chat Viewer
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
    </div>
  );
}

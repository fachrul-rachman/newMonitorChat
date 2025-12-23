import type { ReactNode } from "react";
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function MonitorChatLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color:var(--color-surface)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[color:var(--color-primary)] px-2 py-1 text-xs font-semibold text-[color:var(--color-primary-contrast)]">
              Internal
            </span>
            <h1 className="text-lg font-semibold leading-tight">
              Monitoring Chat
            </h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <nav className="flex items-center gap-1 text-sm">
              <Link
                href="/"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-text)] focus-visible:outline-none"
              >
                Dashboard
              </Link>
              <Link
                href="/chat"
                className="rounded-md px-3 py-1.5 text-xs font-medium text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface-2)] hover:text-[color:var(--color-text)] focus-visible:outline-none"
              >
                Chat Viewer
              </Link>
            </nav>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4">{children}</main>
    </div>
  );
}

"use client";

import { useTheme } from "../../lib/theme";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-medium text-[var(--color-text)] shadow-sm hover:bg-[var(--color-surface)] focus-visible:outline-none"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <span aria-hidden="true" className="h-3.5 w-3.5">
        {isDark ? (
          <svg
            viewBox="0 0 24 24"
            className="h-full w-full text-[var(--color-muted)]"
          >
            <path
              d="M21 12.79A9 9 0 0 1 11.21 3 7 7 0 1 0 21 12.79Z"
              fill="currentColor"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-full w-full text-[var(--color-muted)]"
          >
            <path
              d="M12 4.5a1 1 0 0 1-1-1V2a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm0 17a1 1 0 0 1-1-1V19a1 1 0 1 1 2 0v1.5a1 1 0 0 1-1 1Zm7.5-7.5a1 1 0 0 1 1-1H22a1 1 0 1 1 0 2h-1.5a1 1 0 0 1-1-1Zm-17 0a1 1 0 0 1 1-1H5a1 1 0 1 1 0 2H3.5a1 1 0 0 1-1-1ZM18.19 7.81a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 0 1 1.41 1.41L19.6 7.81a1 1 0 0 1-1.41 0Zm-13.44 13.44a1 1 0 0 1 0-1.41l1.06-1.06a1 1 0 1 1 1.41 1.41L6.16 21.25a1 1 0 0 1-1.41 0ZM6.16 7.81 5.1 6.75A1 1 0 0 1 6.5 5.34L7.56 6.4a1 1 0 0 1-1.41 1.41Zm11.03 11.03-1.06-1.06a1 1 0 1 1 1.41-1.41l1.06 1.06a1 1 0 0 1-1.41 1.41ZM12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7Z"
              fill="currentColor"
            />
          </svg>
        )}
      </span>
      <span className="hidden sm:inline">
        {isDark ? "Night mode" : "Light mode"}
      </span>
      <span className="inline sm:hidden">{isDark ? "Night" : "Light"}</span>
    </button>
  );
}


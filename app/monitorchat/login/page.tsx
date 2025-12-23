import Link from "next/link";
import { isAuthConfigured } from "../../../lib/auth";

type LoginSearchParams = {
  error?: string;
  redirectTo?: string;
};

type LoginPageProps = {
  searchParams: Promise<LoginSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const error = params?.error;
  const redirectTo = params?.redirectTo ?? "/";
  const configured = isAuthConfigured();

  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-[var(--color-bg)] px-4 py-8">
      <div className="w-full max-w-md rounded-lg border border-[var(--color-border)] bg-[color:var(--color-surface)] p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold text-[color:var(--color-text)]">
          Monitoring Chat Login
        </h2>
        <p className="mb-4 text-sm text-[color:var(--color-muted)]">
          Hanya untuk penggunaan internal tim.
        </p>
        {!configured && (
          <div className="mb-4 rounded border border-[color:var(--color-warning)] bg-[color:var(--color-warning)]/10 px-3 py-2 text-sm text-[color:var(--color-text)]">
            Konfigurasi AUTH belum lengkap. Set{" "}
            <code>AUTH_USERNAME</code>, <code>AUTH_PASSWORD</code>, dan{" "}
            <code>AUTH_SESSION_SECRET</code> di environment.
          </div>
        )}
        {error === "1" && (
          <div className="mb-4 rounded border border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-text)]">
            Login gagal. Username atau password salah.
          </div>
        )}
        {error === "config" && (
          <div className="mb-4 rounded border border-[color:var(--color-danger)] bg-[color:var(--color-danger)]/10 px-3 py-2 text-sm text-[color:var(--color-text)]">
            Login tidak dapat diproses karena konfigurasi AUTH belum lengkap.
          </div>
        )}
        <form method="POST" action="/api/login" className="space-y-4">
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="space-y-1 text-sm">
            <label
              htmlFor="username"
              className="block text-xs font-medium text-[color:var(--color-muted)]"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="block w-full rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none"
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-[color:var(--color-muted)]"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="block w-full rounded-md border border-[var(--color-border)] bg-[color:var(--color-surface)] px-3 py-2 text-sm outline-none"
              required
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md bg-[color:var(--color-primary)] py-2 text-sm font-medium text-[color:var(--color-primary-contrast)] hover:bg-[color:var(--color-primary)]/90 disabled:opacity-60"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-xs text-[color:var(--color-muted)]">
          Jika lupa credential, hubungi admin sistem.{" "}
          <Link
            href="/"
            className="underline decoration-[color:var(--color-primary)] decoration-1 underline-offset-2"
          >
            Kembali ke halaman utama
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

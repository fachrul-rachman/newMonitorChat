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
  const redirectTo = params?.redirectTo ?? "/monitorchat";
  const configured = isAuthConfigured();

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-semibold text-zinc-900">
          Monitoring Chat Login
        </h2>
        <p className="mb-4 text-sm text-zinc-600">
          Hanya untuk penggunaan internal tim.
        </p>
        {!configured && (
          <div className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Konfigurasi AUTH belum lengkap. Set{" "}
            <code>AUTH_USERNAME</code>, <code>AUTH_PASSWORD</code>, dan{" "}
            <code>AUTH_SESSION_SECRET</code> di environment.
          </div>
        )}
        {error === "1" && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            Login gagal. Username atau password salah.
          </div>
        )}
        {error === "config" && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900">
            Login tidak dapat diproses karena konfigurasi AUTH belum lengkap.
          </div>
        )}
        <form
          method="POST"
          action="/monitorchat/api/login"
          className="space-y-4"
        >
          <input type="hidden" name="redirectTo" value={redirectTo} />
          <div className="space-y-1 text-sm">
            <label
              htmlFor="username"
              className="block text-xs font-medium text-zinc-700"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              required
            />
          </div>
          <div className="space-y-1 text-sm">
            <label
              htmlFor="password"
              className="block text-xs font-medium text-zinc-700"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900"
              required
            />
          </div>
          <button
            type="submit"
            className="flex w-full items-center justify-center rounded-md bg-zinc-900 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            Login
          </button>
        </form>
        <p className="mt-4 text-xs text-zinc-500">
          Jika lupa credential, hubungi admin sistem.{" "}
          <Link href="/" className="underline">
            Kembali ke halaman utama
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

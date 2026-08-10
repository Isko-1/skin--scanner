"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitGoogle() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success Supabase redirects the browser away to Google, so there's
    // nothing further to do here — the flow continues at /auth/callback.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Неверный email или пароль." : error.message);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <div className="mb-2">
        <h1 className="text-lg font-semibold">Вход</h1>
        <p className="text-sm text-slate-500">Войдите, чтобы видеть свои родинки и статистику.</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-base"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Пароль
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-base"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-40"
        >
          {loading ? "Входим…" : "Войти"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        или
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={submitGoogle}
        disabled={googleLoading}
        className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-5 text-sm font-medium text-[var(--color-foreground)] transition active:scale-95 disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
        </svg>
        {googleLoading ? "Перенаправляем…" : "Продолжить через Google"}
      </button>

      <p className="text-center text-sm text-slate-500">
        Нет аккаунта?{" "}
        <Link href="/register" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
          Зарегистрироваться
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

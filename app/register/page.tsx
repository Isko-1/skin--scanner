"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";

const supabase = createClient();

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submitGoogle() {
    setGoogleLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // On success Supabase redirects away to Google — nothing else to do here.
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Пароль должен быть не короче 6 символов.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Пароли не совпадают.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If email confirmation is enabled in the Supabase project, signUp
    // returns a user but no session — in that case there's nothing to
    // redirect into yet, so tell the person to confirm their email instead.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  if (checkEmail) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-2 bg-[var(--color-background)] px-4 text-center text-[var(--color-foreground)]">
        <p className="text-sm font-medium text-[var(--color-foreground)]">Проверьте почту</p>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Мы отправили письмо для подтверждения на {email}. После подтверждения вы сможете войти.
        </p>
        <Link href="/login" className="mt-2 text-sm text-[var(--color-accent)] underline">
          К странице входа
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <div className="mb-2">
        <p className="text-xs font-medium uppercase tracking-wide">
          <AnimatedGradientText speed={0.4}>Skin Scanner</AnimatedGradientText>
        </p>
        <h1 className="text-lg font-semibold">Регистрация</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Родинки и статистика сохранятся за вашим аккаунтом.</p>
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
            className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Пароль
          <input
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Повторите пароль
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
          />
        </label>

        {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password || !confirmPassword}
          className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40"
        >
          {loading ? "Создаём аккаунт…" : "Зарегистрироваться"}
        </button>
      </form>

      <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        или
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>

      <button
        type="button"
        onClick={submitGoogle}
        disabled={googleLoading}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-5 text-sm font-medium text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] active:scale-95 disabled:opacity-40"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z" />
          <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z" />
          <path fill="#FBBC05" d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z" />
          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z" />
        </svg>
        {googleLoading ? "Перенаправляем…" : "Продолжить через Google"}
      </button>

      <p className="text-center text-sm text-[var(--color-muted-foreground)]">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="font-medium text-[var(--color-accent)] underline underline-offset-2">
          Войти
        </Link>
      </p>
    </main>
  );
}

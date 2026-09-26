"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

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
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Пароль должен содержать не менее 6 символов.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Введенные пароли не совпадают.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

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
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <div className="panel w-full max-w-sm p-6 sm:p-8">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-950/60 text-sky-400 border border-sky-800/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-100">Подтвердите адрес почты</h2>
          <p className="mt-2 text-xs text-slate-400">
            Мы отправили ссылку для активации аккаунта на <strong className="text-slate-200">{email}</strong>.
            Перейдите по ней для входа в систему.
          </p>
          <Link href="/login" className="btn-primary mt-5 inline-flex w-full text-xs">
            Перейти ко входу
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="panel w-full max-w-sm p-6 sm:p-8">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white shadow-sm">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-slate-100">
            Регистрация пациента
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Создайте защищённый аккаунт для наблюдения за кожей
          </p>
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={submitGoogle}
          disabled={googleLoading}
          className="btn-ghost mb-5 w-full text-xs"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.11A12 12 0 0 0 12 24Z"
            />
            <path
              fill="#FBBC05"
              d="M5.27 14.28A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.28V6.61H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.39l4-3.11Z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.61l4 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
            />
          </svg>
          {googleLoading ? "Подключение…" : "Зарегистрироваться через Google"}
        </button>

        {/* Divider */}
        <div className="mb-5 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-[11px] text-slate-500">или заполните форму</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        {/* Form */}
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field text-xs"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field text-xs"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-slate-300">Повторите пароль</span>
            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field text-xs"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-rose-900/50 bg-rose-950/30 p-2.5 text-xs text-rose-300">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="mt-0.5 shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password}
            className="btn-primary mt-1 w-full text-xs"
          >
            {loading ? "Регистрация…" : "Создать аккаунт"}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-5 border-t border-slate-800/80 pt-4 text-center">
          <p className="text-xs text-slate-400">
            Уже есть аккаунт?{" "}
            <Link
              href="/login"
              className="font-medium text-sky-400 hover:underline"
            >
              Войти
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

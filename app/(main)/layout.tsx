import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDoctor =
    (user?.app_metadata as Record<string, unknown> | undefined)?.doctor === true;

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {user && (
        <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[#0b0f17]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              aria-label="Skin Scanner — Главная"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-sm">
                <svg
                  width="18"
                  height="18"
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
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-slate-100">
                  SkinScanner
                </span>
                <span className="text-[10px] font-medium text-slate-400">
                  Клинический контроль
                </span>
              </div>
            </Link>

            {/* Nav & Account */}
            <div className="flex items-center gap-2 sm:gap-4">
              <nav className="flex items-center gap-1.5">
                <Link
                  href="/"
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
                >
                  Родинки
                </Link>
                {isDoctor && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-300 transition hover:bg-amber-950/40"
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                    </svg>
                    <span>Дашборд врача</span>
                  </Link>
                )}
              </nav>

              <div className="h-4 w-px bg-slate-800" />

              {/* User Pill & Logout */}
              <div className="flex items-center gap-2">
                <span
                  title={user.email ?? ""}
                  className="hidden max-w-[130px] truncate text-xs text-slate-400 sm:inline-block"
                >
                  {user.email}
                </span>

                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-md border border-slate-700/60 bg-slate-800/80 px-2.5 py-1.2 text-xs font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-700 hover:text-white"
                  >
                    Выйти
                  </button>
                </form>
              </div>
            </div>
          </div>
        </header>
      )}

      {children}
    </div>
  );
}

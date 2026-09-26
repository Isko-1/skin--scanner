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
        <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            {/* Brand Logo */}
            <Link
              href="/"
              className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
              aria-label="Skin Scanner — Главная"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-600 text-white shadow-xs">
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
                <span className="text-sm font-semibold tracking-tight text-slate-900">
                  SkinScanner
                </span>
                <span className="text-[10px] font-medium text-slate-500">
                  Клинический контроль
                </span>
              </div>
            </Link>

            {/* Nav & Account */}
            <div className="flex items-center gap-2 sm:gap-4">
              <nav className="flex items-center gap-1.5">
                <Link
                  href="/"
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Родинки
                </Link>
                <Link
                  href="/device-guide"
                  className="rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  Зонд & FAQ
                </Link>
                {isDoctor && (
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 transition hover:bg-amber-100"
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

              <div className="h-4 w-px bg-slate-200" />

              {/* User Pill & Logout */}
              <div className="flex items-center gap-2">
                <span
                  title={user.email ?? ""}
                  className="hidden max-w-[130px] truncate text-xs text-slate-500 sm:inline-block"
                >
                  {user.email}
                </span>

                <form action="/logout" method="post">
                  <button
                    type="submit"
                    className="btn-ghost py-1 px-2.5 text-xs"
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

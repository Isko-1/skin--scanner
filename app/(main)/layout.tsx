import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Shared header for the authenticated part of the app (home, mole detail,
// mole/new, doctor dashboard). /capture is intentionally outside this group —
// it already has its own back-button header and stays full-bleed/dark for
// camera visibility, so this bar would just eat into that screen.
export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <>
      {user && (
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-3 text-xs text-[var(--color-muted-foreground)]">
          <Link href="/" className="flex items-center gap-1.5 font-medium text-[var(--color-primary)]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            </svg>
            Skin Scanner
          </Link>
          <div className="flex items-center gap-3">
            <span className="max-w-[160px] truncate">{user.email}</span>
            <form action="/logout" method="post">
              <button type="submit" className="text-[var(--color-muted-foreground)] underline underline-offset-2 hover:text-[var(--color-foreground)]">
                Выйти
              </button>
            </form>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

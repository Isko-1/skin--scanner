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
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-3 text-xs text-slate-400">
          <Link href="/" className="font-medium text-slate-500">
            Skin Scanner
          </Link>
          <div className="flex items-center gap-3">
            <span className="max-w-[160px] truncate">{user.email}</span>
            <form action="/logout" method="post">
              <button type="submit" className="text-slate-500 underline underline-offset-2">
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

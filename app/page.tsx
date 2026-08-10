import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";

// NOTE: no auth check yet — matches /dashboard and /mole/[id], which also
// query supabaseAdmin directly without a session check (flagged in README
// as a real gap to close before this goes further than a demo).
export default async function HomePage() {
  const db = supabaseAdmin;
  const { data: moles } = await db
    .from("moles")
    .select("id, label, body_location")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-md bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Мои родинки</h1>
        <Link
          href="/mole/new"
          className="flex min-h-11 items-center rounded-lg bg-[var(--color-accent)] px-5 text-sm font-medium text-white active:scale-95"
        >
          + Добавить
        </Link>
      </header>

      {!moles?.length && (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-slate-600">Пока нет родинок</p>
          <p className="text-sm text-slate-400">Добавьте первую, чтобы начать отслеживание.</p>
        </div>
      )}

      <ul className="space-y-2">
        {moles?.map((m) => (
          <li key={m.id}>
            <Link
              href={`/mole/${m.id}`}
              className="flex items-center justify-between rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium">{m.label}</p>
                {m.body_location && <p className="text-sm text-slate-500">{m.body_location}</p>}
              </div>
              <span className="text-slate-400">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

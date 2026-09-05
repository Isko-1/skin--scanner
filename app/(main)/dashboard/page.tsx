import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";

const RISK_THRESHOLD = 0.3; // cases below this don't need a doctor's eyes

export default async function DashboardPage() {
  const db = createClient();

  // Doctor check lives here now (middleware is zero-network, can't do it).
  // getUser() is safe in a Server Component — no Edge time budget applies.
  const {
    data: { user },
  } = await db.auth.getUser();

  if (!user) redirect("/login?next=/dashboard");

  const isDoctor =
    (user.app_metadata as Record<string, unknown> | undefined)?.doctor === true;
  if (!isDoctor) redirect("/");

  const { data: cases } = await db
    .from("photo_analyses")
    .select("id, mole_id, risk_score, created_at, moles(label, body_location, owner_id)")
    .gte("risk_score", RISK_THRESHOLD)
    .order("risk_score", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">Случаи, требующие внимания</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">risk_score ≥ {RISK_THRESHOLD}, сначала самые тревожные</p>
      </header>

      {!cases?.length && (
        <div className="panel mt-16 px-6 py-10 text-center">
          <p className="text-sm font-medium text-[var(--color-foreground)]">Нет случаев выше порога</p>
          <p className="text-sm text-[var(--color-muted-foreground)]">Здесь появятся сканы с risk_score ≥ {RISK_THRESHOLD}.</p>
        </div>
      )}

      {/* Mobile: cards. Table Handling anti-pattern is a wide table breaking
          layout on small screens — a fixed grid never overflows horizontally. */}
      <ul className="space-y-3 md:hidden">
        {cases?.map((c: any) => {
          const { label } = riskLevel(c.risk_score);
          return (
            <li key={c.id} className="panel p-4">
              <div className="flex items-center gap-3">
                <RiskGauge score={c.risk_score} size="size-14 text-[11px]" />
                <div className="flex-1">
                  <Link href={`/mole/${c.mole_id}`} className="font-medium text-[var(--color-accent)]">
                    {c.moles?.label ?? c.mole_id}
                  </Link>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{c.moles?.body_location ?? "—"} · {label}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">{new Date(c.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <div className="panel hidden overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--color-border)] bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <tr>
              <th className="px-4 py-3 font-medium">Родинка</th>
              <th className="px-4 py-3 font-medium">Локация</th>
              <th className="px-4 py-3 font-medium">Risk score</th>
              <th className="px-4 py-3 font-medium">Дата</th>
            </tr>
          </thead>
          <tbody>
            {cases?.map((c: any) => (
              <tr key={c.id} className="border-b border-[var(--color-border)] last:border-0">
                <td className="px-4 py-3">
                  <Link href={`/mole/${c.mole_id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                    {c.moles?.label ?? c.mole_id}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{c.moles?.body_location ?? "—"}</td>
                <td className="px-4 py-3">
                  <RiskGauge score={c.risk_score} size="size-12 text-[10px]" />
                </td>
                <td className="px-4 py-3 text-[var(--color-muted-foreground)]">{new Date(c.created_at).toLocaleDateString("ru-RU")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

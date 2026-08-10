import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";

const RISK_THRESHOLD = 0.3; // cases below this don't need a doctor's eyes

export default async function DashboardPage() {
  const db = supabaseAdmin;

  // RLS still applies for non-admin calls, but this route runs server-side
  // with the service key, so the doctor-only gate lives at the page/auth layer
  // (middleware checking app_metadata.doctor) — not shown here, add before shipping.
  const { data: cases } = await db
    .from("photo_analyses")
    .select("id, mole_id, risk_score, created_at, moles(label, body_location, owner_id)")
    .gte("risk_score", RISK_THRESHOLD)
    .order("risk_score", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-3xl bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <header className="mb-6">
        <h1 className="text-lg font-semibold">Случаи, требующие внимания</h1>
        <p className="text-sm text-slate-500">risk_score ≥ {RISK_THRESHOLD}, сначала самые тревожные</p>
      </header>

      {!cases?.length && (
        <div className="mt-16 text-center">
          <p className="text-sm font-medium text-slate-600">Нет случаев выше порога</p>
          <p className="text-sm text-slate-400">Здесь появятся сканы с risk_score ≥ {RISK_THRESHOLD}.</p>
        </div>
      )}

      {/* Mobile: cards. Table Handling anti-pattern is a wide table breaking
          layout on small screens — a fixed grid never overflows horizontally. */}
      <ul className="space-y-3 md:hidden">
        {cases?.map((c: any) => {
          const { label } = riskLevel(c.risk_score);
          return (
            <li key={c.id} className="rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <RiskGauge score={c.risk_score} size="size-14 text-[11px]" />
                <div className="flex-1">
                  <Link href={`/mole/${c.mole_id}`} className="font-medium text-[var(--color-accent)]">
                    {c.moles?.label ?? c.mole_id}
                  </Link>
                  <p className="text-xs text-slate-500">{c.moles?.body_location ?? "—"} · {label}</p>
                  <p className="text-xs text-slate-400">{new Date(c.created_at).toLocaleDateString("ru-RU")}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: table */}
      <table className="hidden w-full text-left text-sm md:table">
        <thead className="border-b border-[var(--color-border)] text-slate-500">
          <tr>
            <th className="py-2 font-normal">Родинка</th>
            <th className="py-2 font-normal">Локация</th>
            <th className="py-2 font-normal">Risk score</th>
            <th className="py-2 font-normal">Дата</th>
          </tr>
        </thead>
        <tbody>
          {cases?.map((c: any) => (
            <tr key={c.id} className="border-b border-[var(--color-border)]">
              <td className="py-3">
                <Link href={`/mole/${c.mole_id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                  {c.moles?.label ?? c.mole_id}
                </Link>
              </td>
              <td className="py-3 text-slate-500">{c.moles?.body_location ?? "—"}</td>
              <td className="py-3">
                <RiskGauge score={c.risk_score} size="size-12 text-[10px]" />
              </td>
              <td className="py-3 text-slate-500">{new Date(c.created_at).toLocaleDateString("ru-RU")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

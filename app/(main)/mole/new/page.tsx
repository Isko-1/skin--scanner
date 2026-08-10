"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewMolePage() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");

  // No Supabase call here on purpose: writing to `moles` this early meant an
  // empty row landed in the DB the moment someone typed a label, even if
  // they backed out of the camera permission prompt or just closed the tab —
  // every abandoned flow left an orphaned mole with zero scans. Now label +
  // body_location just ride along as query params, and /capture creates the
  // mole row itself, only once there's an actual photo to attach to it.
  function proceed() {
    if (!label.trim()) return;
    const params = new URLSearchParams({ label: label.trim() });
    if (bodyLocation.trim()) params.set("body_location", bodyLocation.trim());
    router.push(`/capture?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-[var(--color-background)] px-4 py-6 text-[var(--color-foreground)]">
      <h1 className="text-lg font-semibold">Новая родинка</h1>

      <label className="flex flex-col gap-1 text-sm">
        Название
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="например, левое плечо"
          className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Расположение на теле (необязательно)
        <input
          value={bodyLocation}
          onChange={(e) => setBodyLocation(e.target.value)}
          placeholder="например, спина, под лопаткой"
          className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
        />
      </label>

      <button
        onClick={proceed}
        disabled={!label.trim()}
        className="min-h-11 rounded-xl bg-[var(--color-accent)] px-5 text-sm font-medium text-white shadow-sm transition hover:brightness-110 active:scale-95 disabled:opacity-40"
      >
        Продолжить к съёмке
      </button>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const LABEL_MAX = 60;
const LOCATION_MAX = 80;

export default function NewMolePage() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  // Existing labels for this user, lowercased, just for a soft duplicate
  // warning — nothing here blocks submission, since "родинка" x3 is a
  // legitimate thing to have before you've picked better names for them.
  const [existingLabels, setExistingLabels] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("moles")
      .select("label")
      .then(({ data }) => setExistingLabels((data ?? []).map((m) => m.label.trim().toLowerCase())));
  }, []);

  const isDuplicate = label.trim() !== "" && existingLabels.includes(label.trim().toLowerCase());

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
          maxLength={LABEL_MAX}
          className="min-h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] px-3 text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]/40"
        />
      </label>
      {isDuplicate && (
        <p className="-mt-2 text-xs text-[var(--color-warning)]">
          Родинка с таким названием уже есть — можно продолжить, но её будет сложнее отличить в списке.
        </p>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Расположение на теле (необязательно)
        <input
          value={bodyLocation}
          onChange={(e) => setBodyLocation(e.target.value)}
          placeholder="например, спина, под лопаткой"
          maxLength={LOCATION_MAX}
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

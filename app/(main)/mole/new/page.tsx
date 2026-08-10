"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function NewMolePage() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!label.trim()) return;
    setSaving(true);

    // middleware.ts already guarantees only a logged-in user reaches this
    // page, so we just read their session — the old anonymous
    // ensureSession() fallback is gone now that real accounts exist.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Сессия истекла, войдите заново.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("moles")
      .insert({ label: label.trim(), body_location: bodyLocation.trim() || null, owner_id: user.id })
      .select()
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }
    router.push(`/capture?mole_id=${data.id}`);
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
          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-base"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Расположение на теле (необязательно)
        <input
          value={bodyLocation}
          onChange={(e) => setBodyLocation(e.target.value)}
          placeholder="например, спина, под лопаткой"
          className="min-h-11 rounded-lg border border-[var(--color-border)] bg-white px-3 text-base"
        />
      </label>

      {error && <p className="text-sm text-[var(--color-destructive)]">{error}</p>}

      <button
        onClick={save}
        disabled={!label.trim() || saving}
        className="min-h-11 rounded-lg bg-[var(--color-accent)] px-5 text-sm font-medium text-white transition active:scale-95 disabled:opacity-40"
      >
        {saving ? "Сохранение…" : "Продолжить к съёмке"}
      </button>
    </main>
  );
}

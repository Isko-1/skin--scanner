"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const LABEL_MAX = 60;
const LOCATION_MAX = 80;

export default function NewMolePage() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [bodyLocation, setBodyLocation] = useState("");
  const [existingLabels, setExistingLabels] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("moles")
      .select("label")
      .then(({ data }) => setExistingLabels((data ?? []).map((m) => m.label.trim().toLowerCase())));
  }, []);

  const isDuplicate = label.trim() !== "" && existingLabels.includes(label.trim().toLowerCase());

  function proceed() {
    if (!label.trim()) return;
    const params = new URLSearchParams({ label: label.trim() });
    if (bodyLocation.trim()) params.set("body_location", bodyLocation.trim());
    router.push(`/capture?${params.toString()}`);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href="/"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-slate-700 hover:text-white"
          aria-label="Назад к списку"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-100">
            Регистрация родинки
          </h1>
          <p className="text-xs text-slate-400">
            Укажите ориентир и перейдите к оптической съёмке
          </p>
        </div>
      </div>

      <div className="panel space-y-5 p-6">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-300">
            Название или ориентир <span className="text-rose-400">*</span>
          </span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="например, левое плечо у ключицы"
            maxLength={LABEL_MAX}
            className="input-field text-xs"
          />
          <span className="text-[11px] text-slate-500">
            Короткое понятное название, чтобы легко находить родинку в регистре
          </span>
        </label>

        {isDuplicate && (
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5 text-xs text-amber-300">
            Образование с похожим названием уже есть в вашем списке. Вы можете продолжить, но рекомендуем уточнить место.
          </div>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-300">
            Анатомическая область (необязательно)
          </span>
          <input
            value={bodyLocation}
            onChange={(e) => setBodyLocation(e.target.value)}
            placeholder="например, спина, под правой лопаткой"
            maxLength={LOCATION_MAX}
            className="input-field text-xs"
          />
        </label>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Что произойдёт дальше:</span>
          <p className="mt-0.5 text-slate-400">
            Откроется камера с детектором резкости и площади кожи. После фиксации чёткого кадра снимок привяжется к этой родинке.
          </p>
        </div>

        <button
          onClick={proceed}
          disabled={!label.trim()}
          className="btn-primary w-full text-xs"
        >
          Перейти к съёмке
        </button>
      </div>
    </main>
  );
}

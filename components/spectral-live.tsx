"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";
import { SpectralChart, type SpectralChannels } from "@/components/spectral-chart";

interface PatternMatch {
  label: string;
  category: "benign" | "concerning";
  similarity: number;
}

interface SpectralReading {
  id: string;
  reading_type: "lesion" | "reference";
  risk_score: number | null;
  pattern_match: PatternMatch | null;
  channels?: SpectralChannels;
  created_at: string;
}

export function SpectralLive({ moleId }: { moleId: string }) {
  const [latest, setLatest] = useState<SpectralReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Только 'lesion' — у 'reference' никогда нет risk_score/pattern_match
    // (это опорный замер здоровой кожи, не сам по себе результат).
    supabase
      .from("spectral_readings")
      .select("*")
      .eq("mole_id", moleId)
      .eq("reading_type", "lesion")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setLatest(data as SpectralReading);
      });

    const channel = supabase
      .channel(`spectral:${moleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spectral_readings", filter: `mole_id=eq.${moleId}` },
        (payload) => {
          const row = payload.new as SpectralReading;
          if (row.reading_type === "lesion") setLatest(row);
        }
      )
      .on(
        // Ловим момент, когда пришла пара (reference) и risk_score/
        // pattern_match у уже показанного lesion-замера заполняются задним
        // числом — без этого UI так и остался бы на "ждём вторую половину".
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "spectral_readings", filter: `mole_id=eq.${moleId}` },
        (payload) => {
          const row = payload.new as SpectralReading;
          setLatest((current) => (current && row.id === current.id ? row : current));
        }
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moleId]);

  if (!latest) {
    return (
      <div className="panel flex items-center gap-2 p-3 text-sm text-[var(--color-muted-foreground)]">
        <span
          className={`h-2 w-2 rounded-full ${connected ? "bg-[var(--color-success)]" : "bg-[var(--color-muted-foreground)]"}`}
        />
        {connected ? "Ждём замер со спектрального зонда…" : "Подключаемся…"}
      </div>
    );
  }

  // Замер родинки уже пришёл, но пары (замера здоровой кожи рядом) ещё нет —
  // risk_score/pattern_match посчитать не из чего. Показываем это честно,
  // а не как нулевой/по умолчанию низкий риск.
  if (latest.risk_score === null) {
    return (
      <div className="panel flex items-center gap-3 p-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-[var(--color-border)]">
          <span className="text-xs text-[var(--color-muted-foreground)]">…</span>
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-foreground)]">Замер родинки получен</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Ждём второй замер — рядом на здоровой коже, чтобы посчитать контраст.
          </p>
        </div>
      </div>
    );
  }

  const { label } = riskLevel(latest.risk_score);
  const pattern = latest.pattern_match;

  return (
    <div className="panel space-y-4 p-4">
      <div className="flex items-center gap-3">
        <RiskGauge score={latest.risk_score} />
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Спектральный замер</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {label} · {new Date(latest.created_at).toLocaleTimeString("ru-RU")}
          </p>
          {pattern && (
            <p
              className={`mt-0.5 text-xs font-semibold ${
                pattern.category === "concerning" ? "text-amber-500" : "text-emerald-500"
              }`}
            >
              Паттерн: {pattern.label} ({Math.round(pattern.similarity * 100)}% совпадение)
            </p>
          )}
        </div>
      </div>

      {latest.channels && <SpectralChart channels={latest.channels} />}
    </div>
  );
}

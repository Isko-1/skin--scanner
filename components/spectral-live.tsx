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
  risk_score: number;
  pattern_match: PatternMatch | null;
  channels?: SpectralChannels;
  created_at: string;
}

export function SpectralLive({ moleId }: { moleId: string }) {
  const [latest, setLatest] = useState<SpectralReading | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // Загружаем последний созданный замер
    supabase
      .from("spectral_readings")
      .select("*")
      .eq("mole_id", moleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setLatest(data as SpectralReading);
      });

    const channel = supabase
      .channel(`spectral:${moleId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spectral_readings", filter: `mole_id=eq.${moleId}` },
        (payload) => setLatest(payload.new as SpectralReading)
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

      {/* Отрисовка 10-канального спектрального графика */}
      {latest.channels && <SpectralChart channels={latest.channels} />}
    </div>
  );
}

"use client";

import { MultimodalResult } from "@/lib/multimodal-risk";

interface Props {
  data: MultimodalResult | null;
}

export function MultimodalRiskCard({ data }: Props) {
  if (!data) return null;

  const { combinedScore, level, levelLabel, photoScore, spectralScore, modality, elevationDelta, recommendation } = data;

  const colorConfig = {
    low: {
      border: "border-emerald-200",
      bg: "bg-emerald-50/50",
      badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
      bar: "bg-emerald-500",
      text: "text-emerald-700",
    },
    moderate: {
      border: "border-amber-200",
      bg: "bg-amber-50/50",
      badge: "bg-amber-100 text-amber-800 border-amber-300",
      bar: "bg-amber-500",
      text: "text-amber-700",
    },
    high: {
      border: "border-rose-200",
      bg: "bg-rose-50/50",
      badge: "bg-rose-100 text-rose-800 border-rose-300",
      bar: "bg-rose-500",
      text: "text-rose-700",
    },
  }[level];

  return (
    <div className={`panel overflow-hidden border p-5 ${colorConfig.border} ${colorConfig.bg} space-y-4`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-2xs border border-slate-200/80 text-sky-600">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Комплексный индекс риска</h2>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colorConfig.badge}`}>
                {levelLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Синтез визуальной морфологии (фото) и оптического спектра (щуп)
            </p>
          </div>
        </div>

        <div className="flex items-baseline gap-1 text-right">
          <span className="text-2xl font-black tracking-tight text-slate-900">
            {(combinedScore * 100).toFixed(0)}%
          </span>
          <span className="text-xs text-slate-500">риск</span>
        </div>
      </div>

      {/* Visual Progress Bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded-full bg-slate-200/80 overflow-hidden">
          <div
            className={`h-full ${colorConfig.bar} transition-all duration-500`}
            style={{ width: `${Math.max(5, combinedScore * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 font-medium">
          <span>0% (Норма)</span>
          <span>50% (Пограничный)</span>
          <span>100% (Высокая настороженность)</span>
        </div>
      </div>

      {/* Modality Breakdown Pills */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {/* Photo Analysis Pill */}
        <div className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span>📷</span>
            <span className="text-slate-600 font-medium">Фото-AI:</span>
          </div>
          <span className="font-bold text-slate-900">
            {photoScore !== null ? `${(photoScore * 100).toFixed(0)}%` : "Нет снимка"}
          </span>
        </div>

        {/* Spectral Probe Pill */}
        <div className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-1.5">
            <span>🔬</span>
            <span className="text-slate-600 font-medium">Спектр (AS7341):</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="font-bold text-slate-900">
              {spectralScore !== null ? `${(spectralScore * 100).toFixed(0)}%` : "Нет замера"}
            </span>
            {elevationDelta > 0 && (
              <span className="text-[10px] font-bold text-rose-600" title="Неоткалиброванная эвристика: контраст по нескольким длинам волн выше типичного, см. lib/spectral.ts">
                (+{(elevationDelta * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Elevation note if optical spectrum increased the risk */}
      {modality === "multimodal" && elevationDelta > 0 && (
        <div className="rounded-xl bg-amber-100/70 border border-amber-300/80 px-3 py-2 text-xs text-amber-900 flex items-start gap-2">
          <span>⚠️</span>
          <p>
            <strong>Оптический спектр повысил индекс риска (+{(elevationDelta * 100).toFixed(0)}%):</strong> контраст по нескольким длинам волн (540/650/950нм) отличается от типичного — это неоткалиброванная эвристика (см. lib/spectral.ts), а не подтверждённое оптическое измерение глубины залегания.
          </p>
        </div>
      )}

      {/* Clinical Recommendation */}
      <div className="rounded-xl bg-white/80 border border-slate-200 p-3 text-xs text-slate-700 space-y-1">
        <p className="font-semibold text-slate-900 flex items-center gap-1">
          <span>🩺</span> Рекомендация клинического контроля:
        </p>
        <p className="leading-relaxed text-slate-600">
          {recommendation}
        </p>
      </div>
    </div>
  );
}

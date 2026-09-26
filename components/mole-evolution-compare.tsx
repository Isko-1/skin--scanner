"use client";

import { useState } from "react";
import Image from "next/image";

interface ScanItem {
  id: string;
  created_at: string;
  risk_score: number | string;
  sharpness_score?: number;
  thumbUrl?: string;
}

interface MoleEvolutionCompareProps {
  firstScan: ScanItem;
  latestScan: ScanItem;
}

export function MoleEvolutionCompare({ firstScan, latestScan }: MoleEvolutionCompareProps) {
  const [isOpen, setIsOpen] = useState(false);

  const firstRisk = Math.round(Number(firstScan.risk_score) * 100);
  const latestRisk = Math.round(Number(latestScan.risk_score) * 100);
  const riskDiff = latestRisk - firstRisk;

  return (
    <div className="panel overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-50 text-sky-700 border border-sky-200">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5" />
            </svg>
          </span>
          <div>
            <span className="text-xs font-semibold text-slate-900">
              Сравнение динамики (Первый и последний скан)
            </span>
            <p className="text-[11px] text-slate-500">
              {riskDiff > 0
                ? `Индекс риска вырос на ${riskDiff}% с первого снимка`
                : riskDiff < 0
                ? `Индекс риска снизился на ${Math.abs(riskDiff)}%`
                : "Уровень риска стабилен"}
            </p>
          </div>
        </div>

        <span className="text-xs font-medium text-sky-600 flex items-center gap-1">
          {isOpen ? "Свернуть" : "Сравнить"}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {isOpen && (
        <div className="border-t border-slate-200 bg-slate-50/70 p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* First Scan (Baseline) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Базовый скан</span>
                <span className="text-slate-500">
                  {new Date(firstScan.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                {firstScan.thumbUrl ? (
                  <Image
                    src={firstScan.thumbUrl}
                    alt="Базовый скан"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    Снимок недоступен
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Индекс риска:</span>
                <span className="font-mono font-bold text-slate-900">{firstRisk}%</span>
              </div>
            </div>

            {/* Latest Scan */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-slate-700">Последний скан</span>
                <span className="text-slate-500">
                  {new Date(latestScan.created_at).toLocaleDateString("ru-RU", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
                {latestScan.thumbUrl ? (
                  <Image
                    src={latestScan.thumbUrl}
                    alt="Последний скан"
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                    Снимок недоступен
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Индекс риска:</span>
                <span
                  className={`font-mono font-bold ${
                    latestRisk >= 70 ? "text-rose-600" : latestRisk >= 30 ? "text-amber-600" : "text-emerald-600"
                  }`}
                >
                  {latestRisk}%
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

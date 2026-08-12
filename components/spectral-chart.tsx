"use client";

export interface SpectralChannels {
  f1: number;
  f2: number;
  f3: number;
  f4: number;
  f5: number;
  f6: number;
  f7: number;
  f8: number;
  clear: number;
  nir: number;
}

const CHANNELS_INFO = [
  { key: "f1", label: "F1", nm: "415nm", color: "#6b21a8" }, // Violet
  { key: "f2", label: "F2", nm: "445nm", color: "#3b82f6" }, // Blue
  { key: "f3", label: "F3", nm: "480nm", color: "#06b6d4" }, // Cyan
  { key: "f4", label: "F4", nm: "515nm", color: "#10b981" }, // Green
  { key: "f5", label: "F5", nm: "555nm", color: "#84cc16" }, // Yellow-Green
  { key: "f6", label: "F6", nm: "590nm", color: "#eab308" }, // Yellow
  { key: "f7", label: "F7", nm: "630nm", color: "#f97316" }, // Orange
  { key: "f8", label: "F8", nm: "680nm", color: "#ef4444" }, // Red
  { key: "clear", label: "CLR", nm: "Clear", color: "#9ca3af" }, // Gray
  { key: "nir", label: "NIR", nm: "910nm", color: "#881337" }, // Deep Red/IR
] as const;

export function SpectralChart({ channels }: { channels: SpectralChannels }) {
  // Находим максимальное значение для пропорционального масштабирования
  const visibleValues = CHANNELS_INFO.filter((c) => c.key !== "clear").map(
    (c) => channels[c.key as keyof SpectralChannels] || 0
  );
  const maxVal = Math.max(...visibleValues, 100);

  return (
    <div className="rounded-xl bg-slate-900 p-4 text-white shadow-inner">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Спектральный профиль (415нм - 910нм)
        </h4>
        <span className="rounded bg-blue-500/20 px-2 py-0.5 text-[10px] font-medium text-blue-400">
          AS7341 10-Channel
        </span>
      </div>

      {/* Столбчатый график с цветовой кодировкой длин волн */}
      <div className="flex h-32 items-end justify-between gap-1 pt-4 pb-1">
        {CHANNELS_INFO.map((ch) => {
          const val = channels[ch.key as keyof SpectralChannels] || 0;
          const heightPercent = Math.min(100, Math.max(8, (val / maxVal) * 100));

          return (
            <div key={ch.key} className="group relative flex flex-1 flex-col items-center h-full justify-end">
              {/* Высплывающий тултип при наведении */}
              <div className="absolute -top-7 hidden rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-200 group-hover:block z-10 whitespace-nowrap shadow">
                {ch.label} ({ch.nm}): {val}
              </div>

              {/* Столбец */}
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: ch.color,
                  boxShadow: `0 0 8px ${ch.color}66`,
                }}
              />

              {/* Метка длин волн */}
              <span className="mt-1 text-[9px] font-medium text-slate-400">{ch.label}</span>
            </div>
          );
        })}
      </div>

      {/* Легенда под графиком */}
      <div className="mt-2 flex justify-between border-t border-slate-800 pt-2 text-[10px] text-slate-400">
        <span>Фиолетовый (415нм)</span>
        <span>Зелёный (555нм)</span>
        <span>Инфракрасный (910нм)</span>
      </div>
    </div>
  );
}

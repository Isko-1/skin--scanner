"use client";

import { useEffect, useState } from "react";

interface Props {
  moleId: string;
}

interface Criterion {
  key: "A" | "B" | "C" | "D" | "E";
  letter: string;
  name: string;
  question: string;
  hint: string;
}

const CRITERIA: Criterion[] = [
  {
    key: "A",
    letter: "A",
    name: "Асимметрия (Asymmetry)",
    question: "Две половины родинки не совпадают по форме или рельефу",
    hint: "Если провести мысленную ось через середину, одна сторона отличается от другой.",
  },
  {
    key: "B",
    letter: "B",
    name: "Границы (Border)",
    question: "Края неровные, зубчатые, размытые или фестончатые",
    hint: "У доброкачественных родинок контур четкий и гладкий, как овал или круг.",
  },
  {
    key: "C",
    letter: "C",
    name: "Цвет (Color)",
    question: "Неоднородный оттенок (вкрапления черного, синего, белого, красного)",
    hint: "Обычная родинка имеет один монохромный светло- или темно-коричневый цвет.",
  },
  {
    key: "D",
    letter: "D",
    name: "Диаметр (Diameter)",
    question: "Размер образования превышает 6 мм (больше ластика карандаша)",
    hint: "Хотя меланомы бывают и меньше, размер от 6 мм требует повышенного внимания.",
  },
  {
    key: "E",
    letter: "E",
    name: "Эволюция (Evolving)",
    question: "Родинка меняется со временем (рост, зуд, кровоточивость, изменение формы)",
    hint: "Любые заметные изменения за последние недели или месяцы — самый важный клинический маркер.",
  },
];

export function AbcdeInteractiveChecklist({ moleId }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({
    A: false,
    B: false,
    C: false,
    D: false,
    E: false,
  });

  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`abcde_checklist_${moleId}`);
      if (saved) {
        setChecked(JSON.parse(saved));
      }
    } catch {
      // LocalStorage unavailable
    }
    setIsLoaded(true);
  }, [moleId]);

  // Save changes
  const toggleCriterion = (key: string) => {
    const updated = { ...checked, [key]: !checked[key] };
    setChecked(updated);
    try {
      localStorage.setItem(`abcde_checklist_${moleId}`, JSON.stringify(updated));
    } catch {
      // LocalStorage unavailable
    }
  };

  const resetAll = () => {
    const cleared = { A: false, B: false, C: false, D: false, E: false };
    setChecked(cleared);
    try {
      localStorage.removeItem(`abcde_checklist_${moleId}`);
    } catch {
      // LocalStorage unavailable
    }
  };

  const totalScore = Object.values(checked).filter(Boolean).length;

  const scoreConfig =
    totalScore >= 3
      ? {
          badge: "bg-rose-100 text-rose-800 border-rose-300",
          pill: "bg-rose-50 border-rose-200 text-rose-800",
          status: "Высокая настороженность",
          desc: "Обнаружено 3 и более признаков ABCDE. Настоятельно рекомендуется очный осмотр у дерматоонколога.",
        }
      : totalScore >= 1
      ? {
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          pill: "bg-amber-50 border-amber-200 text-amber-800",
          status: "Умеренная настороженность",
          desc: "Имеются отдельные визуальные особенности. Рекомендуется регулярное фотонаблюдение в динамике.",
        }
      : {
          badge: "bg-emerald-100 text-emerald-800 border-emerald-300",
          pill: "bg-emerald-50 border-emerald-200 text-emerald-800",
          status: "Типичный невус",
          desc: "Признаков атипии по правилу ABCDE не отмечено.",
        };

  return (
    <div className="panel space-y-4 p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-200/80 text-indigo-600 font-bold text-xs">
            ABCDE
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Клинический чеклист ABCDE</h2>
              {isLoaded && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${scoreConfig.badge}`}>
                  {totalScore} из 5 • {scoreConfig.status}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Международный диагностический протокол самообследования кожи
            </p>
          </div>
        </div>

        {totalScore > 0 && (
          <button
            type="button"
            onClick={resetAll}
            className="text-[11px] text-slate-400 hover:text-slate-700 underline self-start sm:self-auto"
          >
            Сбросить
          </button>
        )}
      </div>

      {/* Criteria List */}
      <div className="space-y-2">
        {CRITERIA.map((c) => {
          const isSelected = checked[c.key];
          return (
            <label
              key={c.key}
              className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer select-none ${
                isSelected
                  ? "bg-sky-50/70 border-sky-300 shadow-2xs"
                  : "bg-white hover:bg-slate-50 border-slate-200"
              }`}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => toggleCriterion(c.key)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />

              <div className="flex-1 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    <span className="text-sky-700">{c.letter}</span> — {c.name}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium">
                  {c.question}
                </p>
                <p className="text-[11px] text-slate-500">
                  {c.hint}
                </p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Interpretation box */}
      <div className={`rounded-xl border p-3 text-xs space-y-1 ${scoreConfig.pill}`}>
        <div className="flex items-center justify-between font-semibold">
          <span>Клинический вывод:</span>
          <span>{totalScore} / 5</span>
        </div>
        <p className="leading-relaxed">
          {scoreConfig.desc}
        </p>
      </div>
    </div>
  );
}

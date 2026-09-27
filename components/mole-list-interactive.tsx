"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";
import { NumberTicker } from "@/components/ui/number-ticker";
import { BlurFade } from "@/components/ui/blur-fade";

export interface MoleWithAnalyses {
  id: string;
  label: string;
  body_location: string | null;
  created_at?: string;
  photo_analyses?: {
    id: string;
    risk_score: number | string;
    created_at: string;
    image_path: string;
    sharpness_score?: number;
  }[];
}

interface MoleListInteractiveProps {
  moles: MoleWithAnalyses[];
  thumbnails: Record<string, string | null>;
}

type FilterTab = "all" | "attention" | "high" | "no-scans";
type SortOption = "date-desc" | "risk-desc" | "scans-desc";

export function MoleListInteractive({ moles, thumbnails }: MoleListInteractiveProps) {
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [showAbcdeGuide, setShowAbcdeGuide] = useState(false);

  // Compute stats
  const scans = moles.flatMap((m) => m.photo_analyses ?? []);
  const totalScans = scans.length;
  const avgRisk = totalScans
    ? scans.reduce((sum, a) => sum + Number(a.risk_score), 0) / totalScans
    : null;
  const maxRisk = totalScans
    ? Math.max(...scans.map((a) => Number(a.risk_score)))
    : null;

  // Filter and sort moles
  const filteredMoles = useMemo(() => {
    return moles
      .filter((m) => {
        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const matchLabel = m.label.toLowerCase().includes(q);
          const matchLocation = m.body_location?.toLowerCase().includes(q);
          if (!matchLabel && !matchLocation) return false;
        }

        const analyses = m.photo_analyses ?? [];
        const latest = analyses[0];
        const risk = latest ? Number(latest.risk_score) : null;

        // Tabs
        if (filterTab === "attention") return risk !== null && risk >= 0.3;
        if (filterTab === "high") return risk !== null && risk >= 0.7;
        if (filterTab === "no-scans") return analyses.length === 0;
        return true;
      })
      .sort((a, b) => {
        const aAnalyses = a.photo_analyses ?? [];
        const bAnalyses = b.photo_analyses ?? [];
        const aRisk = aAnalyses[0] ? Number(aAnalyses[0].risk_score) : -1;
        const bRisk = bAnalyses[0] ? Number(bAnalyses[0].risk_score) : -1;

        if (sortOption === "risk-desc") return bRisk - aRisk;
        if (sortOption === "scans-desc") return bAnalyses.length - aAnalyses.length;

        // date-desc default
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      });
  }, [moles, search, filterTab, sortOption]);

  const attentionCount = moles.filter((m) => {
    const r = m.photo_analyses?.[0]?.risk_score;
    return r !== undefined && Number(r) >= 0.3;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header with Title & Action */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Мои родинки
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {moles.length
              ? `${moles.length} ${
                  moles.length === 1 ? "объект" : moles.length < 5 ? "объекта" : "объектов"
                } в регистре клинического наблюдения`
              : "Регистр пуст — добавьте первую родинку для наблюдения"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAbcdeGuide(true)}
            className="btn-ghost text-xs"
            title="Справочник дерматологических критериев ABCDE"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Памятка ABCDE
          </button>

          <Link href="/mole/new" className="btn-primary">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              aria-hidden="true"
            >
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Добавить
          </Link>
        </div>
      </div>

      {/* Clinical Metrics Cards */}
      {moles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="panel p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Родинок</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
              </svg>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-900">
              <NumberTicker value={moles.length} />
            </p>
            <span className="text-[11px] text-slate-500">под контролем</span>
          </div>

          <div className="panel p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Сканирований</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="mt-2 text-xl font-bold text-sky-600">
              <NumberTicker value={totalScans} />
            </p>
            <span className="text-[11px] text-slate-500">фото- и спектро</span>
          </div>

          <div className="panel p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Ср. индекс риска</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <p className="mt-2 text-xl font-bold text-slate-800">
              {avgRisk !== null ? `${Math.round(avgRisk * 100)}%` : "—"}
            </p>
            <span className="text-[11px] text-slate-500">по всем снимкам</span>
          </div>

          <div className="panel p-3.5 shadow-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-medium">Макс. риск</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p className={`mt-2 text-xl font-bold ${maxRisk !== null && maxRisk >= 0.7 ? "text-rose-600" : maxRisk !== null && maxRisk >= 0.3 ? "text-amber-600" : "text-emerald-600"}`}>
              {maxRisk !== null ? `${Math.round(maxRisk * 100)}%` : "—"}
            </p>
            <span className="text-[11px] text-slate-500">пиковое значение</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      {moles.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Search box */}
          <div className="relative flex-1 sm:max-w-xs">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Поиск по названию или локализации…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 text-xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterTab("all")}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                filterTab === "all"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Все ({moles.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("attention")}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 font-medium transition ${
                filterTab === "attention"
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              Внимание ({attentionCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("no-scans")}
              className={`rounded-lg px-2.5 py-1.5 font-medium transition ${
                filterTab === "no-scans"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              Без снимков
            </button>
          </div>
        </div>
      )}

      {/* Mole Cards List */}
      {filteredMoles.length > 0 ? (
        <ul className="space-y-2.5">
          {filteredMoles.map((mole, index) => {
            const analyses = mole.photo_analyses ?? [];
            const latest = analyses[0];
            const risk = latest ? Number(latest.risk_score) : null;
            const thumbUrl = thumbnails[mole.id];
            const riskInfo = risk !== null ? riskLevel(risk) : null;

            return (
              <BlurFade key={mole.id} delay={Math.min(index, 8) * 0.04}>
                <li>
                <Link
                  href={`/mole/${mole.id}`}
                  className="panel panel-interactive flex items-center justify-between gap-4 p-3.5 sm:p-4"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    {/* Thumbnail or placeholder */}
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {thumbUrl ? (
                        <Image
                          src={thumbUrl}
                          alt={mole.label}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
                            <circle cx="12" cy="12" r="3" fill="currentColor" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-slate-900">
                          {mole.label}
                        </span>
                        {riskInfo && (
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              riskInfo.level === "high"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : riskInfo.level === "medium"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {riskInfo.label}
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                        {mole.body_location && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                              <circle cx="12" cy="9" r="2.5" />
                            </svg>
                            {mole.body_location}
                          </span>
                        )}
                        <span>·</span>
                        <span>
                          {analyses.length > 0
                            ? `${analyses.length} ${
                                analyses.length === 1 ? "скан" : analyses.length < 5 ? "скана" : "сканов"
                              }`
                            : "Нет снимков"}
                        </span>
                        {latest && (
                          <>
                            <span>·</span>
                            <span className="text-slate-400">
                              {new Date(latest.created_at).toLocaleDateString("ru-RU", {
                                day: "numeric",
                                month: "short",
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right side: Score & Arrow */}
                  <div className="flex shrink-0 items-center gap-3">
                    {risk !== null ? (
                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-slate-900">
                          {Math.round(risk * 100)}%
                        </span>
                        <p className="text-[10px] text-slate-500">риск</p>
                      </div>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">
                        Ожидает скана
                      </span>
                    )}

                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-400 transition group-hover:translate-x-0.5"
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </Link>
                </li>
              </BlurFade>
            );
          })}
        </ul>
      ) : (
        <div className="panel flex flex-col items-center justify-center p-8 text-center sm:p-12">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-500 border border-slate-200">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {search.trim() || filterTab !== "all"
              ? "Ничего не найдено"
              : "Родинок пока нет"}
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            {search.trim() || filterTab !== "all"
              ? "Попробуйте изменить поисковый запрос или сбросить фильтры."
              : "Зарегистрируйте первую родинку и сделайте снимок для начала клинического мониторинга."}
          </p>
          {search.trim() || filterTab !== "all" ? (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setFilterTab("all");
              }}
              className="btn-ghost mt-3 text-xs"
            >
              Сбросить фильтры
            </button>
          ) : (
            <Link href="/mole/new" className="btn-primary mt-4 text-xs">
              + Добавить первую родинку
            </Link>
          )}
        </div>
      )}

      {/* ABCDE Dermatological Reference Modal */}
      {showAbcdeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="panel-elevated relative max-h-[90vh] w-full max-w-lg overflow-y-auto p-6 bg-white border border-slate-200 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Правило ABCDE: клинические признаки меланомы
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Международный дерматологический стандарт самообследования
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAbcdeGuide(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Закрыть"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-sky-700">A — Asymmetry (Асимметрия):</span>
                <p className="mt-0.5 text-slate-700">
                  Если мысленно провести линию через центр, две половины родинки не совпадают по форме.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-sky-700">B — Border (Края):</span>
                <p className="mt-0.5 text-slate-700">
                  Неровные, фестончатые, размытые или зазубренные границы образования.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-sky-700">C — Color (Цвет):</span>
                <p className="mt-0.5 text-slate-700">
                  Неоднородный оттенок: присутствие оттенков коричневого, черного, розового, белого или синеватого.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-sky-700">D — Diameter (Диаметр):</span>
                <p className="mt-0.5 text-slate-700">
                  Размер более 6 мм (сопоставимо с ластиком на карандаше), хотя меланома бывает и меньше.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <span className="font-bold text-sky-700">E — Evolution (Динамика/Изменения):</span>
                <p className="mt-0.5 text-slate-700">
                  Наиболее важный признак: любое изменение размера, формы, цвета, появление зуда или кровоточивости со временем.
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <strong>Медицинское предупреждение:</strong> Данное приложение проводит предварительную оценку с помощью нейросети и спектрометрии, но не заменяет дерматоскопию у квалифицированного врача. При любых сомнениях обратитесь к специалисту.
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAbcdeGuide(false)}
                className="btn-primary text-xs"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RiskGauge, riskLevel } from "@/components/risk-gauge";
import { PdfReportButton } from "@/components/pdf-report-button";
import { SpectralLive } from "@/components/spectral-live";
import { SpectralButtons } from "@/components/spectral-buttons";
import { MoleEvolutionCompare } from "@/components/mole-evolution-compare";
import { MultimodalRiskCard } from "@/components/multimodal-risk-card";
import { computeMultimodalRisk } from "@/lib/multimodal-risk";
import { DeviceStatusBadge } from "@/components/device-status-badge";
import { BlurFade } from "@/components/ui/blur-fade";

export const dynamic = "force-dynamic";

export default async function MoleHistoryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: mole } = await supabase
    .from("moles")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!mole) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 text-rose-600">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">Родинка не найдена</h1>
          <p className="mt-1 text-xs text-slate-500">
            Запись не существует либо принадлежит другому аккаунту.
          </p>
        </div>
        <Link href="/" className="btn-primary mt-2 text-xs">
          ← К списку родинок
        </Link>
      </main>
    );
  }

  const { data: analyses } = await supabase
    .from("photo_analyses")
    .select("*")
    .eq("mole_id", params.id)
    .order("created_at", { ascending: false });

  // Parallel signed URL fetching
  const thumbEntries = await Promise.all(
    (analyses ?? []).map(async (a) => {
      try {
        const { data } = await supabase.storage.from("mole-photos").createSignedUrl(a.image_path, 3600);
        return [a.id, data?.signedUrl] as const;
      } catch {
        return [a.id, undefined] as const;
      }
    })
  );
  const thumbs = new Map(thumbEntries);

  // Trend: compare latest risk to previous
  const latestRisk = analyses?.[0]?.risk_score ?? null;
  const prevRisk = analyses?.[1]?.risk_score ?? null;
  const trend =
    latestRisk !== null && prevRisk !== null
      ? latestRisk > prevRisk + 0.05
        ? "up"
        : latestRisk < prevRisk - 0.05
        ? "down"
        : "stable"
      : null;

  // Oldest vs latest for evolution compare
  const hasMultipleScans = (analyses?.length ?? 0) >= 2;
  const firstAnalysis = analyses ? analyses[analyses.length - 1] : null;
  const latestAnalysis = analyses ? analyses[0] : null;

  // Fetch latest paired spectral reading to compute multimodal risk
  const { data: latestSpectral } = await supabase
    .from("spectral_readings")
    .select("risk_score, channels, created_at")
    .eq("mole_id", params.id)
    .eq("reading_type", "lesion")
    .not("risk_score", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Guard: if raw channels in DB are all 0 or missing, risk score is 0
  const isZeroChannels =
    !latestSpectral?.channels ||
    Object.values(latestSpectral.channels as Record<string, number>).every((v) => Number(v) <= 0);

  const sanitizedSpectralRisk = isZeroChannels
    ? 0
    : latestSpectral?.risk_score != null
    ? Number(latestSpectral.risk_score)
    : null;

  const multimodalData = computeMultimodalRisk(
    latestRisk !== null ? Number(latestRisk) : null,
    sanitizedSpectralRisk
  );

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-8">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="btn-ghost flex h-9 w-9 p-0 items-center justify-center rounded-lg"
              aria-label="Назад к списку"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>

            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {mole.label}
              </h1>
              {mole.body_location && (
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                    <circle cx="12" cy="9" r="2.5" />
                  </svg>
                  {mole.body_location}
                </p>
              )}
            </div>
          </div>

          {/* Trend indicator */}
          {trend && (
            <div
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                trend === "up"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : trend === "down"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-700 border-slate-200"
              }`}
            >
              {trend === "up"
                ? "↑ Риск вырос"
                : trend === "down"
                ? "↓ Риск снизился"
                : "→ Без динамики"}
            </div>
          )}
        </div>

        {/* Action bar */}
        <div className="flex items-center gap-2">
          <Link
            href={`/capture?mole_id=${params.id}`}
            className="btn-primary flex-1 text-xs"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
            </svg>
            Новый фотоскан
          </Link>
          <PdfReportButton moleLabel={mole.label} bodyLocation={mole.body_location} />
        </div>
      </header>

      {/* Multimodal Combined Risk Card (Photo AI + Optical Spectral DRS) */}
      {multimodalData && (
        <div className="mb-6">
          <MultimodalRiskCard data={multimodalData} />
        </div>
      )}

      {/* Evolution Comparison (if 2+ scans exist) */}
      {hasMultipleScans && firstAnalysis && latestAnalysis && (
        <div className="mb-6">
          <MoleEvolutionCompare
            firstScan={{
              id: firstAnalysis.id,
              created_at: firstAnalysis.created_at,
              risk_score: firstAnalysis.risk_score,
              sharpness_score: firstAnalysis.sharpness_score,
              thumbUrl: thumbs.get(firstAnalysis.id),
            }}
            latestScan={{
              id: latestAnalysis.id,
              created_at: latestAnalysis.created_at,
              risk_score: latestAnalysis.risk_score,
              sharpness_score: latestAnalysis.sharpness_score,
              thumbUrl: thumbs.get(latestAnalysis.id),
            }}
          />
        </div>
      )}

      {/* Spectral section */}
      <div className="mb-6 space-y-3">
        <DeviceStatusBadge />
        <SpectralLive moleId={params.id} />
        <SpectralButtons moleId={params.id} />
      </div>

      {/* Scan history */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            История обследований ({analyses?.length ?? 0})
          </h2>
        </div>

        {!analyses?.length ? (
          <div className="panel flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400 border border-slate-200">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Пока нет фотосканов</p>
              <p className="mt-1 text-xs text-slate-500">
                Сделайте первый снимок дерматоскопом или камерой с близкого расстояния.
              </p>
            </div>
            <Link
              href={`/capture?mole_id=${params.id}`}
              className="btn-primary mt-2 text-xs"
            >
              Сделать первый скан
            </Link>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {analyses.map((a, index) => {
              const { label, level } = riskLevel(a.risk_score);
              const thumb = thumbs.get(a.id);
              const sharpness = Math.round(a.sharpness_score ?? 0);
              const isSharp = sharpness >= 60;

              return (
                <BlurFade key={a.id} delay={Math.min(index, 8) * 0.04}>
                <li
                  className="panel flex items-center justify-between gap-3 p-3.5"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt="Скан родинки"
                          width={56}
                          height={56}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-400">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <path d="M21 15l-5-5L5 21" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900">
                        {new Date(a.created_at).toLocaleString("ru-RU", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            level === "high"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : level === "medium"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {label}
                        </span>
                        <span
                          className={`text-[10px] ${
                            isSharp ? "text-slate-500" : "text-amber-600"
                          }`}
                          title={`Индекс резкости: ${sharpness}`}
                        >
                          Резкость: {sharpness} {isSharp ? "" : "(слабая)"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Gauge */}
                  <div className="shrink-0 text-right flex items-center gap-3">
                    <RiskGauge score={a.risk_score} size="size-12 text-[10px]" />
                  </div>
                </li>
                </BlurFade>
              );
            })}
          </ul>
        )}
      </section>

      {/* Clinical disclaimer */}
      <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0 text-slate-500"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span>
          Система осуществляет математический анализ оптических снимков и спектральных данных.
          Результаты не являются окончательным клиническим диагнозом. При изменении размера,
          формы или цвета новообразования необходимо обратиться к врачу-дерматоонкологу.
        </span>
      </div>
    </main>
  );
}

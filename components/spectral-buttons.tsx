"use client";

import { useState } from "react";

type ReadingType = "lesion" | "reference";

type StepState = "idle" | "pending" | "done" | "error";

interface StepStatus {
  lesion: StepState;
  reference: StepState;
}

interface Props {
  moleId: string;
  /** If you want to link the manual reading to a photo analysis */
  photoAnalysisId?: string;
}

// Placeholder channels — all zeros. Used when the user presses a button
// WITHOUT a real device connected; the route still stores the reading and
// triggers the pairing logic so the UX flow can be demonstrated end-to-end.
// When a real probe is connected it sends its own POST to /api/spectral and
// these manual buttons are just for demo / test use without the hardware.
//
// Replace zeros with real AS7341 data if you ever wire the browser buttons
// directly to a Web Serial / Web Bluetooth readout.
function placeholderChannels() {
  return { f1: 0, f2: 0, f3: 0, f4: 0, f5: 0, f6: 0, f7: 0, f8: 0, clear: 0, nir: 0 };
}

async function postReading(
  moleId: string,
  readingType: ReadingType,
  photoAnalysisId?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/spectral/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mole_id: moleId,
        reading_type: readingType,
        channels: placeholderChannels(),
        ...(photoAnalysisId ? { photo_analysis_id: photoAnalysisId } : {}),
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Ошибка сети" };
  }
}

export function SpectralButtons({ moleId, photoAnalysisId }: Props) {
  const [step, setStep] = useState<StepStatus>({ lesion: "idle", reference: "idle" });
  const [error, setError] = useState<string | null>(null);

  async function handlePress(type: ReadingType) {
    setError(null);
    setStep((s) => ({ ...s, [type]: "pending" }));

    const result = await postReading(moleId, type, photoAnalysisId);

    if (result.ok) {
      setStep((s) => ({ ...s, [type]: "done" }));
      // Reset back to idle after 4 s so button can be pressed again
      setTimeout(() => setStep((s) => ({ ...s, [type]: "idle" })), 4000);
    } else {
      setStep((s) => ({ ...s, [type]: "error" }));
      setError(result.error ?? "Неизвестная ошибка");
      setTimeout(() => setStep((s) => ({ ...s, [type]: "idle" })), 4000);
    }
  }

  const bothDone = step.lesion === "done" && step.reference === "done";

  return (
    <div className="panel space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-primary)]/10">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" aria-hidden="true">
            <path d="M9 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
            <path d="M15 3h6v6" /><path d="M10 14 21 3" />
          </svg>
        </span>
        <div>
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            Ручной ввод замеров
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Нажмите кнопку после каждого замера зондом
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <StepBadge label="1. Родинка" state={step.lesion} />
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <StepBadge label="2. Здоровая кожа" state={step.reference} />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <ScanButton
          id="spectral-btn-lesion"
          label="Родинка"
          description="Приложите зонд к родинке"
          icon={<MoleIcon />}
          colorClass="bg-amber-500 hover:bg-amber-600 active:bg-amber-700"
          glowClass="shadow-amber-200"
          state={step.lesion}
          disabled={step.lesion === "pending"}
          onClick={() => handlePress("lesion")}
        />
        <ScanButton
          id="spectral-btn-reference"
          label="Здоровая кожа"
          description="Приложите зонд рядом"
          icon={<SkinIcon />}
          colorClass="bg-[var(--color-primary)] hover:brightness-110 active:brightness-90"
          glowClass="shadow-cyan-200"
          state={step.reference}
          disabled={step.reference === "pending"}
          onClick={() => handlePress("reference")}
        />
      </div>

      {/* Feedback */}
      {bothDone && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-success)]/10 px-3 py-2 text-xs font-medium text-[var(--color-success)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Оба замера получены — результат обновляется выше
        </div>
      )}
      {!bothDone && (step.lesion === "done" || step.reference === "done") && (
        <div className="flex items-center gap-2 rounded-xl bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          {step.lesion === "done"
            ? "Теперь приложите зонд к здоровой коже рядом с родинкой"
            : "Теперь приложите зонд к родинке"}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-[var(--color-destructive)]/10 px-3 py-2 text-xs text-[var(--color-destructive)]">
          Ошибка: {error}
        </div>
      )}

      {/* Hint */}
      <p className="text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        Сделайте оба замера в течение 5 минут — тогда они сопоставятся автоматически
        и появится результат анализа.
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBadge({ label, state }: { label: string; state: StepState }) {
  const colors: Record<StepState, string> = {
    idle: "text-[var(--color-muted-foreground)]",
    pending: "text-[var(--color-primary)] animate-pulse",
    done: "text-[var(--color-success)] font-semibold",
    error: "text-[var(--color-destructive)]",
  };
  const icons: Record<StepState, string> = {
    idle: "○",
    pending: "◌",
    done: "✓",
    error: "✕",
  };
  return (
    <span className={`flex items-center gap-1 ${colors[state]}`}>
      <span aria-hidden="true">{icons[state]}</span>
      {label}
    </span>
  );
}

interface ScanButtonProps {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  colorClass: string;
  glowClass: string;
  state: StepState;
  disabled: boolean;
  onClick: () => void;
}

function ScanButton({
  id,
  label,
  description,
  icon,
  colorClass,
  glowClass,
  state,
  disabled,
  onClick,
}: ScanButtonProps) {
  const isPending = state === "pending";
  const isDone = state === "done";
  const isError = state === "error";

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} — ${description}`}
      className={[
        "relative flex flex-col items-center gap-2 rounded-2xl px-3 py-4 text-white transition-all duration-200",
        colorClass,
        isDone ? "ring-2 ring-[var(--color-success)] ring-offset-1" : "",
        isError ? "ring-2 ring-[var(--color-destructive)] ring-offset-1" : "",
        disabled ? "cursor-wait opacity-70" : "cursor-pointer",
        !disabled ? `shadow-lg ${glowClass}` : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Icon / spinner / checkmark */}
      <span className="relative flex h-10 w-10 items-center justify-center">
        {isPending ? (
          <svg
            className="h-7 w-7 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : isDone ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : isError ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        ) : (
          icon
        )}
      </span>

      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className="text-[11px] font-normal leading-tight opacity-80">{description}</span>

      {/* Pulse ring on pending */}
      {isPending && (
        <span className="absolute inset-0 rounded-2xl ring-2 ring-white/40 animate-ping" aria-hidden="true" />
      )}
    </button>
  );
}

function MoleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="7" opacity="0.9" />
      <circle cx="12" cy="12" r="4" opacity="0.5" />
    </svg>
  );
}

function SkinIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

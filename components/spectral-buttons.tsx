"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ReadingType = "lesion" | "reference";
type BtnState = "idle" | "waiting" | "done" | "timeout";

const WAIT_SECONDS = 30;

interface Props {
  moleId: string;
}

export function SpectralButtons({ moleId }: Props) {
  const [lesion, setLesion] = useState<BtnState>("idle");
  const [reference, setReference] = useState<BtnState>("idle");

  // Refs to clearTimeout without stale closure issues
  const lesionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Countdown display
  const [lesionSec, setLesionSec] = useState(WAIT_SECONDS);
  const [refSec, setRefSec] = useState(WAIT_SECONDS);
  const lesionInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const refInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Realtime: watch for new readings from the probe ──────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`spectral-buttons:${moleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "spectral_readings",
          filter: `mole_id=eq.${moleId}`,
        },
        (payload) => {
          const row = payload.new as { reading_type: string };
          if (row.reading_type === "lesion") markDone("lesion");
          if (row.reading_type === "reference") markDone("reference");
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [moleId]); // eslint-disable-line react-hooks/exhaustive-deps

  function startWaiting(type: ReadingType) {
    const set = type === "lesion" ? setLesion : setReference;
    const setSec = type === "lesion" ? setLesionSec : setRefSec;
    const timerRef = type === "lesion" ? lesionTimer : refTimer;
    const intervalRef = type === "lesion" ? lesionInterval : refInterval;

    // Clear any previous timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    set("waiting");
    setSec(WAIT_SECONDS);

    // Countdown
    let remaining = WAIT_SECONDS;
    intervalRef.current = setInterval(() => {
      remaining -= 1;
      setSec(remaining);
    }, 1000);

    // Timeout fallback
    timerRef.current = setTimeout(() => {
      clearInterval(intervalRef.current!);
      set("timeout");
      // Reset to idle after 6s so user can retry
      setTimeout(() => set("idle"), 6000);
    }, WAIT_SECONDS * 1000);
  }

  function markDone(type: ReadingType) {
    const set = type === "lesion" ? setLesion : setReference;
    const setSec = type === "lesion" ? setLesionSec : setRefSec;
    const timerRef = type === "lesion" ? lesionTimer : refTimer;
    const intervalRef = type === "lesion" ? lesionInterval : refInterval;

    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);

    set("done");
    setSec(WAIT_SECONDS);

    // Auto-reset after 8s
    setTimeout(() => set("idle"), 8000);
  }

  const bothDone = lesion === "done" && reference === "done";

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
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Спектральный зонд</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Нажмите кнопку, затем приложите зонд — данные придут автоматически
          </p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
        <StepBadge label="1. Родинка" state={lesion} />
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <StepBadge label="2. Здоровая кожа" state={reference} />
      </div>

      {/* Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <ScanButton
          id="spectral-btn-lesion"
          label="Родинка"
          hint="Приложите зонд к родинке"
          icon={<MoleIcon />}
          colorClass="bg-amber-500"
          state={lesion}
          seconds={lesionSec}
          onClick={() => startWaiting("lesion")}
        />
        <ScanButton
          id="spectral-btn-reference"
          label="Здоровая кожа"
          hint="Приложите зонд рядом"
          icon={<SkinIcon />}
          colorClass="bg-[var(--color-primary)]"
          state={reference}
          seconds={refSec}
          onClick={() => startWaiting("reference")}
        />
      </div>

      {/* Status banners */}
      {bothDone && (
        <Banner color="success" icon="✓">
          Оба замера получены — результат обновляется выше
        </Banner>
      )}
      {!bothDone && lesion === "done" && reference !== "done" && (
        <Banner color="warning" icon="→">
          Теперь приложите зонд к <strong>здоровой коже</strong> рядом с родинкой
        </Banner>
      )}
      {!bothDone && reference === "done" && lesion !== "done" && (
        <Banner color="warning" icon="→">
          Теперь приложите зонд к <strong>родинке</strong>
        </Banner>
      )}
      {(lesion === "timeout" || reference === "timeout") && (
        <Banner color="error" icon="!">
          Данные не пришли — убедитесь, что зонд подключён к Wi-Fi и направлен верно
        </Banner>
      )}

      <p className="text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
        Сделайте оба замера в течение 5 минут — тогда они сопоставятся и появится анализ
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBadge({ label, state }: { label: string; state: BtnState }) {
  const map: Record<BtnState, { color: string; icon: string }> = {
    idle:    { color: "text-[var(--color-muted-foreground)]", icon: "○" },
    waiting: { color: "text-[var(--color-primary)] animate-pulse", icon: "◌" },
    done:    { color: "text-[var(--color-success)] font-semibold", icon: "✓" },
    timeout: { color: "text-[var(--color-destructive)]", icon: "✕" },
  };
  const { color, icon } = map[state];
  return (
    <span className={`flex items-center gap-1 text-xs ${color}`}>
      <span aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

function ScanButton({
  id, label, hint, icon, colorClass, state, seconds, onClick,
}: {
  id: string;
  label: string;
  hint: string;
  icon: React.ReactNode;
  colorClass: string;
  state: BtnState;
  seconds: number;
  onClick: () => void;
}) {
  const isWaiting = state === "waiting";
  const isDone    = state === "done";
  const isTimeout = state === "timeout";
  const disabled  = isWaiting || isDone;

  return (
    <button
      id={id}
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label} — ${hint}`}
      className={[
        "relative flex flex-col items-center gap-2 overflow-hidden rounded-2xl px-3 py-4 text-white transition-all duration-200 select-none",
        colorClass,
        isDone    ? "ring-2 ring-[var(--color-success)] ring-offset-1 opacity-90" : "",
        isTimeout ? "opacity-60" : "",
        disabled  ? "cursor-default" : "cursor-pointer hover:brightness-110 active:scale-95 shadow-lg",
      ].filter(Boolean).join(" ")}
    >
      {/* Countdown fill bar */}
      {isWaiting && (
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/40 transition-all"
          style={{ width: `${(seconds / WAIT_SECONDS) * 100}%` }}
          aria-hidden="true"
        />
      )}

      {/* Icon area */}
      <span className="relative flex h-10 w-10 items-center justify-center">
        {isWaiting ? (
          <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
        ) : isDone ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : isTimeout ? (
          <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
        ) : (
          icon
        )}
      </span>

      <span className="text-sm font-semibold leading-tight">{label}</span>
      <span className="text-[11px] font-normal leading-tight opacity-80">
        {isWaiting ? `Ждём… ${seconds}с` : isTimeout ? "Не пришло" : isDone ? "Получено ✓" : hint}
      </span>

      {/* Pulse ring while waiting */}
      {isWaiting && (
        <span className="absolute inset-0 rounded-2xl animate-ping ring-2 ring-white/30" aria-hidden="true" />
      )}
    </button>
  );
}

function Banner({ color, icon, children }: {
  color: "success" | "warning" | "error";
  icon: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: "bg-emerald-50 text-emerald-800 border border-emerald-200",
    warning: "bg-amber-50 text-amber-800 border border-amber-200",
    error:   "bg-rose-50 text-rose-800 border border-rose-200",
  };
  return (
    <div className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs border ${styles[color]}`}>
      <span aria-hidden="true" className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { scoreCanvasSharpness } from "@/lib/sharpness";

const supabase = createClient();

const SHARPNESS_MIN = 60; // recalibrate against real test shots — see lib/sharpness.ts

type Phase = "camera" | "review" | "uploading" | "error";

export default function CapturePage({ searchParams }: { searchParams: { mole_id?: string } }) {
  const moleId = searchParams.mole_id;
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // holds the captured frame
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<Phase>("camera");
  const [sharpness, setSharpness] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1280 } } })
      .then((stream) => {
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        setErrorMsg("Не удалось получить доступ к камере. Разрешите доступ и обновите страницу.");
        setPhase("error");
      });
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function capture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    // Guards against the fast-tap race (video not ready yet); the shutter
    // button is also disabled until cameraReady, so this is a safety net.
    if (!video || !canvas || !video.videoWidth || !video.videoHeight) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const score = scoreCanvasSharpness(canvas);
    setSharpness(score);
    setPhase("review");

    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }

  function retake() {
    setSharpness(null);
    setPhase("camera");
  }

  async function upload() {
    if (!moleId) {
      setErrorMsg("Нет mole_id — открой захват со страницы конкретной родинки.");
      setPhase("error");
      return;
    }
    const canvas = canvasRef.current!;
    setPhase("uploading");

    const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));

    // middleware.ts already guarantees a logged-in user reached this page,
    // so we just read the session instead of the old anonymous-only
    // ensureSession() fallback.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("Сессия истекла. Войдите заново и повторите попытку.");
      setPhase("error");
      return;
    }
    const path = `${user.id}/${moleId}/${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage.from("mole-photos").upload(path, blob);
    if (uploadError) {
      setErrorMsg(uploadError.message);
      setPhase("error");
      return;
    }

    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mole_id: moleId, image_path: path, sharpness_score: sharpness }),
    });
    if (!res.ok) {
      setErrorMsg((await res.json()).error ?? "Классификация не удалась.");
      setPhase("error");
      return;
    }

    router.push(`/mole/${moleId}`);
  }

  const isBlurry = sharpness !== null && sharpness < SHARPNESS_MIN;

  return (
    // h-dvh (not min-h-screen) locks this to the actual visible viewport —
    // min-h-screen plus mobile browsers' shifting address-bar chrome could
    // make the page taller than what's on screen, pushing the shutter
    // button in the footer below the fold and forcing a scroll to reach it.
    // overflow-hidden backs that up so there's never a scrollbar to need in
    // the first place. Combined with the viewport meta tag fix in
    // app/layout.tsx, the button should now always be immediately visible
    // and tappable without any scrolling or zooming.
    <main className="mx-auto flex h-dvh max-w-md flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <header className="flex items-center gap-3 border-b border-neutral-800/80 bg-neutral-950/80 px-4 py-3 backdrop-blur">
        <button
          onClick={() => router.back()}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="text-sm font-medium tracking-wide text-neutral-400">СЪЁМКА РОДИНКИ</h1>
      </header>

      <div className="relative flex-1 overflow-hidden bg-black">
        {/* Video and canvas stay mounted for the whole page lifetime and just
            toggle visibility — unmounting either one drops the live srcObject
            (video) or the ref target capture() writes into (canvas). */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onLoadedMetadata={() => setCameraReady(true)}
          className={`h-full w-full object-cover ${phase === "camera" ? "" : "hidden"}`}
        />

        {phase === "camera" && (
          <>
            {/* Alignment guide: centered circle to line up the mole */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="18" fill="none" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1="50" y1="28" x2="50" y2="34" stroke="#22d3ee" strokeWidth="0.4" />
              <line x1="50" y1="66" x2="50" y2="72" stroke="#22d3ee" strokeWidth="0.4" />
            </svg>
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <p className="text-sm text-neutral-300">Включаем камеру…</p>
              </div>
            )}
            {cameraReady && (
              <p className="absolute inset-x-0 top-4 text-center text-xs text-neutral-300">
                Наведите родинку в круг
              </p>
            )}
          </>
        )}

        <canvas
          ref={canvasRef}
          className={`h-full w-full object-cover ${phase === "camera" ? "hidden" : ""}`}
        />

        {/* Shutter flash feedback */}
        <div
          className={`pointer-events-none absolute inset-0 bg-white transition-opacity duration-150 ${
            flash ? "opacity-80" : "opacity-0"
          }`}
        />

        {phase === "review" && (
          <div
            role="status"
            className={`absolute inset-x-3 bottom-3 rounded-xl border px-4 py-3 text-center text-sm backdrop-blur ${
              isBlurry
                ? "border-red-500/40 bg-red-950/80 text-red-300"
                : "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
            }`}
          >
            {isBlurry ? "Кадр смазан — переснимите" : "Резкость в норме"}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 border-t border-neutral-800/80 bg-neutral-950/80 px-4 py-5 backdrop-blur">
        {phase === "camera" && (
          <button
            onClick={capture}
            disabled={!cameraReady}
            aria-label="Снять кадр"
            className="h-16 w-16 rounded-full border-4 border-neutral-300 bg-white/90 transition active:scale-95 disabled:opacity-40"
          />
        )}

        {phase === "review" && (
          <>
            <button
              onClick={retake}
              className="min-h-11 rounded-lg border border-neutral-700 px-5 text-sm transition hover:bg-neutral-900 active:scale-95"
            >
              Переснять
            </button>
            <button
              onClick={upload}
              disabled={isBlurry}
              title={isBlurry ? "Сначала переснимите чёткий кадр" : undefined}
              className="min-h-11 rounded-lg bg-cyan-500 px-5 text-sm font-medium text-neutral-950 transition active:scale-95 disabled:opacity-40"
            >
              Отправить
            </button>
          </>
        )}

        {phase === "uploading" && (
          <div className="flex flex-col items-center gap-3 py-1">
            <svg className="h-6 w-6 animate-spin text-cyan-400" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <p className="text-sm text-neutral-400">Загрузка и анализ… обычно 5–20 сек</p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center text-sm text-red-400">
            {errorMsg}
            <button onClick={() => setPhase("camera")} className="mt-2 block underline">
              Попробовать снова
            </button>
          </div>
        )}
      </footer>
    </main>
  );
}

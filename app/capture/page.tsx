"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { scoreCanvasSharpness } from "@/lib/sharpness";

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
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);

    const score = scoreCanvasSharpness(canvas);
    setSharpness(score);
    setPhase("review");
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
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const path = `${user?.id}/${moleId}/${Date.now()}.jpg`;

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col bg-neutral-950 text-neutral-100">
      <header className="border-b border-neutral-800 px-4 py-3">
        <h1 className="text-sm font-medium tracking-wide text-neutral-400">СЪЁМКА РОДИНКИ</h1>
      </header>

      <div className="relative flex-1 overflow-hidden bg-black">
        {phase === "camera" && (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
            {/* Alignment guide: centered circle to line up the mole */}
            <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="18" fill="none" stroke="#22d3ee" strokeWidth="0.6" strokeDasharray="2 2" />
              <line x1="50" y1="28" x2="50" y2="34" stroke="#22d3ee" strokeWidth="0.4" />
              <line x1="50" y1="66" x2="50" y2="72" stroke="#22d3ee" strokeWidth="0.4" />
            </svg>
          </>
        )}

        {phase !== "camera" && <canvas ref={canvasRef} className="h-full w-full object-cover" />}

        {phase === "review" && (
          <div
            className={`absolute inset-x-0 bottom-0 border-t px-4 py-2 text-center text-sm ${
              isBlurry ? "border-red-500/40 bg-red-950/80 text-red-300" : "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
            }`}
          >
            {isBlurry ? "Кадр смазан — переснимите" : "Резкость в норме"}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 border-t border-neutral-800 px-4 py-5">
        {phase === "camera" && (
          <button
            onClick={capture}
            className="h-16 w-16 rounded-full border-4 border-neutral-300 bg-white/90 active:scale-95"
            aria-label="Снять кадр"
          />
        )}

        {phase === "review" && (
          <>
            <button
              onClick={retake}
              className="min-h-11 rounded-lg border border-neutral-700 px-5 text-sm active:scale-95"
            >
              Переснять
            </button>
            <button
              onClick={upload}
              disabled={isBlurry}
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

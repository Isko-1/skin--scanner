"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { scoreCanvasSharpness } from "@/lib/sharpness";
import { scoreSkinToneRatio, SKIN_RATIO_MIN } from "@/lib/skin-detection";

const supabase = createClient();

const SHARPNESS_MIN = 60; // recalibrate against real test shots — see lib/sharpness.ts
// Below this, the frame probably isn't skin at all (wall, floor, fabric...).
// Deliberately non-blocking here — see lib/skin-detection.ts for why; the
// actual hard gate on SKIN_RATIO_MIN runs server-side in app/api/classify.
const CLASSIFY_TIMEOUT_MS = 30_000;

type Phase = "camera" | "review" | "uploading" | "error";
type UploadStage = "photo" | "analysis" | null;
// Which retry path applies: "camera" retries the permission prompt,
// "submit" retries upload()/classify (photo is already in canvas),
// "missing-data" means there's nothing to retry — send the person home.
type ErrorStage = "camera" | "submit" | "missing-data" | null;

type CaptureSearchParams = {
  mole_id?: string; // existing mole — "Новый скан" from its history page, or resuming an unfinished one
  label?: string; // brand-new mole — from /mole/new, not saved to the DB yet
  body_location?: string;
};

export default function CapturePage({ searchParams }: { searchParams: CaptureSearchParams }) {
  const { label, body_location: bodyLocation } = searchParams;
  const router = useRouter();

  // Starts as the existing mole's id when we have one; stays null for a
  // brand-new mole until upload() actually creates the row.
  const [moleId, setMoleId] = useState<string | null>(searchParams.mole_id ?? null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // holds the captured frame
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  const [phase, setPhase] = useState<Phase>("camera");
  const [sharpness, setSharpness] = useState<number | null>(null);
  const [skinRatio, setSkinRatio] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorStage, setErrorStage] = useState<ErrorStage>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [flash, setFlash] = useState(false);
  const [focusing, setFocusing] = useState(false);
  // Torch (flashlight) support is inconsistent across browsers — Chrome on
  // Android exposes it via track capabilities, Safari on iPhone doesn't
  // expose a torch control to web pages at all. torchSupported gates
  // whether the button even renders, so people on unsupported browsers
  // don't see a button that can't do anything.
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [uploadStage, setUploadStage] = useState<UploadStage>(null);
  // Set once storage upload succeeds, so a retry after a classify failure
  // resumes from "analyze" instead of re-uploading the same photo again.
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);

  // Phones autofocus for "look at a face across the room", not "2cm from a
  // mole" — without nudging the track toward continuous macro-ish refocus,
  // shots come out soft even on a perfectly steady hand. Both calls are
  // best-effort: getCapabilities()/focusMode are unsupported on iOS Safari
  // and some Android WebViews, so this silently no-ops there rather than
  // blocking capture on a capability most phones do have.
  async function applyFocusMode(mode: "continuous" | "single-shot") {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track?.getCapabilities) return;
    const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
    if (!capabilities.focusMode?.includes(mode)) return;
    try {
      await track.applyConstraints({ advanced: [{ focusMode: mode } as MediaTrackConstraintSet] });
    } catch {
      // Not fatal — camera keeps working, just without the focus nudge.
    }
  }

  // Tap-to-refocus: nudges into a one-shot focus pass, then back to
  // continuous. Where the browser doesn't support focusMode at all this is a
  // harmless no-op (applyFocusMode returns early), so it's always safe to wire up.
  async function tapToFocus() {
    if (phase !== "camera") return;
    setFocusing(true);
    await applyFocusMode("single-shot");
    setTimeout(async () => {
      await applyFocusMode("continuous");
      setFocusing(false);
    }, 700);
  }

  // Best-effort, same pattern as applyFocusMode — torch isn't in every
  // browser's MediaTrackCapabilities, so absence just means the button
  // never renders rather than throwing.
  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch {
      // Some browsers report torch in capabilities but still reject the
      // constraint at runtime — fail silently, button just stays as-is.
    }
  }

  async function requestCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          // "advanced" constraints are best-effort per spec — unsupported ones
          // are ignored rather than rejecting the whole getUserMedia call.
          advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
        },
      });
      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      await applyFocusMode("continuous");

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
      setTorchSupported(Boolean(capabilities?.torch));
      setTorchOn(false);

      setErrorMsg(null);
      setErrorStage(null);
      setPhase("camera");
    } catch {
      if (!mountedRef.current) return;
      setErrorMsg("Не удалось получить доступ к камере. Разрешите доступ и попробуйте снова.");
      setErrorStage("camera");
      setPhase("error");
    }
  }

  useEffect(() => {
    mountedRef.current = true;
    if (!moleId && !label) {
      // Nothing to shoot for — don't even prompt for the camera.
      setErrorMsg("Нет данных о родинке — начните снова с «+ Добавить».");
      setErrorStage("missing-data");
      setPhase("error");
      return;
    }
    requestCamera();
    return () => {
      mountedRef.current = false;
      // Turn the torch off before the track stops — leaving it in an "on"
      // constraint and just dropping the track can leave some Android
      // camera stacks reporting the flashlight as still active until the
      // next app that touches the camera resets it.
      const track = streamRef.current?.getVideoTracks()[0];
      if (track) {
        track.applyConstraints({ advanced: [{ torch: false } as MediaTrackConstraintSet] }).catch(() => {});
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Guards against losing an already-captured, not-yet-sent photo: the
  // in-app back arrow is handled directly in its onClick, but people also
  // swipe-back / use the phone's physical back button, which fires
  // popstate instead. Pushing a extra history entry while on "review" lets
  // us intercept that and ask before actually leaving.
  useEffect(() => {
    if (phase !== "review") return;
    window.history.pushState({ captureGuard: true }, "");
    function onPopState() {
      if (window.confirm("Кадр ещё не отправлен. Уйти и потерять снимок?")) {
        router.back();
      } else {
        window.history.pushState({ captureGuard: true }, "");
      }
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [phase, router]);

  // Same guard for closing the tab / refreshing while a shot is waiting to be sent.
  useEffect(() => {
    if (phase !== "review") return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [phase]);

  function goBack() {
    if (phase === "review" && !window.confirm("Кадр ещё не отправлен. Уйти и потерять снимок?")) return;
    router.back();
  }

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
    setSkinRatio(scoreSkinToneRatio(canvas));
    setPhase("review");

    setFlash(true);
    setTimeout(() => setFlash(false), 150);
  }

  function retake() {
    setSharpness(null);
    setSkinRatio(null);
    setUploadedPath(null);
    setPhase("camera");
  }

  async function upload() {
    if (!moleId && !label) {
      setErrorMsg("Нет данных о родинке — начните снова с «+ Добавить».");
      setErrorStage("missing-data");
      setPhase("error");
      return;
    }

    setErrorMsg(null);
    setErrorStage(null);
    setPhase("uploading");
    setUploadStage("photo");

    // middleware.ts already guarantees a logged-in user reached this page,
    // so we just read the session instead of the old anonymous-only
    // ensureSession() fallback.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErrorMsg("Сессия истекла. Войдите заново и повторите попытку.");
      setErrorStage("submit");
      setPhase("error");
      return;
    }

    // First scan for a brand-new mole: create the row now, only now that
    // there's an actual photo to attach to it. If this fails, nothing has
    // been written and the person is still on /mole/new's data — no
    // orphaned mole either way. moleId is cached in state so a retry after
    // a later failure (e.g. classify) reuses the same row instead of
    // creating a duplicate.
    let currentMoleId = moleId;
    if (!currentMoleId) {
      const { data: newMole, error: moleError } = await supabase
        .from("moles")
        .insert({ label, body_location: bodyLocation || null, owner_id: user.id })
        .select()
        .single();
      if (moleError) {
        setErrorMsg(moleError.message);
        setErrorStage("submit");
        setPhase("error");
        return;
      }
      currentMoleId = newMole.id;
      setMoleId(newMole.id);
    }

    // Skip re-uploading if a previous attempt already got the photo into
    // storage and only classify failed — retry should resume, not redo.
    let path = uploadedPath;
    if (!path) {
      const canvas = canvasRef.current!;
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), "image/jpeg", 0.92));
      path = `${user.id}/${currentMoleId}/${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage.from("mole-photos").upload(path, blob);
      if (uploadError) {
        setErrorMsg(uploadError.message);
        setErrorStage("submit");
        setPhase("error");
        return;
      }
      setUploadedPath(path);
    }

    setUploadStage("analysis");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLASSIFY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mole_id: currentMoleId,
          image_path: path,
          sharpness_score: sharpness,
          skin_ratio: skinRatio,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      const timedOut = (e as Error).name === "AbortError";
      setErrorMsg(
        timedOut
          ? "Анализ занимает необычно долго. Проверьте соединение и попробуйте снова."
          : "Не удалось связаться с сервером. Проверьте соединение и попробуйте снова."
      );
      setErrorStage("submit");
      setPhase("error");
      return;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      setErrorMsg((await res.json()).error ?? "Классификация не удалась.");
      setErrorStage("submit");
      setPhase("error");
      return;
    }

    router.push(`/mole/${currentMoleId}`);
  }

  const isBlurry = sharpness !== null && sharpness < SHARPNESS_MIN;
  // Soft signal only — never blocks "Отправить" the way isBlurry does. The
  // heuristic is unreliable enough across skin tones and lighting that
  // hard-blocking on it would refuse legitimate scans; it's there to make
  // someone pause and double-check, not to gatekeep.
  const looksOffTarget = !isBlurry && skinRatio !== null && skinRatio < SKIN_RATIO_MIN;

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
          onClick={goBack}
          aria-label="Назад"
          className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-800 hover:text-neutral-100"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="flex-1 text-sm font-medium tracking-wide text-neutral-400">
          СЪЁМКА РОДИНКИ
          {label && <span className="ml-2 normal-case text-neutral-300">· {label}</span>}
        </h1>
        {phase === "camera" && torchSupported && (
          <button
            onClick={toggleTorch}
            aria-label={torchOn ? "Выключить фонарик" : "Включить фонарик"}
            aria-pressed={torchOn}
            className={`flex h-9 w-9 items-center justify-center rounded-full transition ${
              torchOn ? "bg-cyan-500 text-neutral-950" : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            }`}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill={torchOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
              <path d="M9 2h6l-1 7h3l-8 13 2-9H8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}
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
          onClick={tapToFocus}
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
                Наведите родинку в круг · тап для фокуса
              </p>
            )}
            {focusing && (
              <p className="absolute inset-x-0 bottom-4 text-center text-xs text-cyan-300">Фокусируем…</p>
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
            key={isBlurry ? "blurry" : looksOffTarget ? "off-target" : "ok"}
            role="status"
            className={`animate-fade-in absolute inset-x-3 bottom-3 rounded-xl border px-4 py-3 text-center text-sm backdrop-blur ${
              isBlurry
                ? "border-red-500/40 bg-red-950/80 text-red-300"
                : looksOffTarget
                  ? "border-amber-500/40 bg-amber-950/80 text-amber-300"
                  : "border-emerald-500/40 bg-emerald-950/80 text-emerald-300"
            }`}
          >
            {isBlurry
              ? "Кадр смазан — переснимите"
              : looksOffTarget
                ? "Не похоже на кожу в кадре — проверьте кадр перед отправкой"
                : "Резкость в норме"}
          </div>
        )}
      </div>

      <footer className="flex items-center justify-center gap-4 border-t border-neutral-800/80 bg-neutral-950/80 px-4 py-5 backdrop-blur">
        <div key={phase} className="animate-fade-in flex items-center justify-center gap-4">
        {phase === "camera" && (
          <button
            onClick={capture}
            disabled={!cameraReady}
            aria-label="Снять кадр"
            className="relative flex h-16 w-16 items-center justify-center text-cyan-400 disabled:opacity-40"
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/70 p-1 transition active:scale-95">
              <span className="h-full w-full rounded-full bg-white shadow-sm" />
            </span>
          </button>
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
            <p className="text-sm text-neutral-400">
              {uploadStage === "photo" ? "Загружаем фото…" : "Анализируем снимок… обычно 5–20 сек"}
            </p>
          </div>
        )}

        {phase === "error" && (
          <div className="text-center text-sm text-red-400">
            {errorMsg}

            {errorStage === "camera" && (
              <button
                onClick={requestCamera}
                className="mt-3 min-h-11 rounded-lg bg-cyan-500 px-5 text-sm font-medium text-neutral-950 transition active:scale-95"
              >
                Разрешить доступ снова
              </button>
            )}

            {errorStage === "submit" && (
              <div className="mt-3 flex justify-center gap-3">
                <button
                  onClick={retake}
                  className="min-h-11 rounded-lg border border-neutral-700 px-4 text-sm transition hover:bg-neutral-900 active:scale-95"
                >
                  Переснять
                </button>
                <button
                  onClick={upload}
                  className="min-h-11 rounded-lg bg-cyan-500 px-4 text-sm font-medium text-neutral-950 transition active:scale-95"
                >
                  Повторить отправку
                </button>
              </div>
            )}

            {errorStage === "missing-data" && (
              <Link href="/" className="mt-3 block underline">
                На главную
              </Link>
            )}
          </div>
        )}
        </div>
      </footer>
    </main>
  );
}

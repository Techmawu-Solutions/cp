"use client";

import { useEffect, useState } from "react";

/**
 * Background effects for the teacher's camera in a live class (spec section 32):
 * blur, or replace the background with a picture. A small person-segmentation
 * model (MediaPipe selfie segmenter) runs in the browser; each camera frame is
 * redrawn on a canvas with the person over the new background, and the canvas
 * becomes the video that's shown (and, in production, published to the video
 * provider — LiveKit's track processors do the same job).
 */
export type BackgroundChoice =
  | { kind: "none" }
  | { kind: "blur"; strength: "light" | "strong" }
  | { kind: "image"; src: string; label: string };

export const NO_BACKGROUND: BackgroundChoice = { kind: "none" };

/** Pictures that come with the platform (public/backgrounds). */
export const PRESET_BACKGROUNDS: { src: string; label: string }[] = [
  { src: "/backgrounds/classroom.svg", label: "Classroom" },
  { src: "/backgrounds/chalkboard.svg", label: "Chalkboard" },
  { src: "/backgrounds/library.svg", label: "Library" },
  { src: "/backgrounds/school-blue.svg", label: "School blue" },
  { src: "/backgrounds/plain-grey.svg", label: "Plain grey" },
];

const MEDIAPIPE_VERSION = "1.0.1";
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL = "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite";

type Segmenter = { segmentForVideo: (v: HTMLVideoElement, ts: number) => { confidenceMasks?: { width: number; height: number; getAsFloat32Array: () => Float32Array; close: () => void }[]; close?: () => void }; close: () => void };
let segmenterPromise: Promise<Segmenter> | null = null;

/** Loads the segmentation model once per page (it's a few MB). */
function loadSegmenter(): Promise<Segmenter> {
  segmenterPromise ??= (async () => {
    const { FilesetResolver, ImageSegmenter } = await import("@mediapipe/tasks-vision");
    const files = await FilesetResolver.forVisionTasks(WASM);
    const make = (delegate: "GPU" | "CPU") => ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL, delegate }, runningMode: "VIDEO", outputConfidenceMasks: true, outputCategoryMask: false });
    try {
      return (await make("GPU")) as unknown as Segmenter;
    } catch {
      return (await make("CPU")) as unknown as Segmenter;
    }
  })();
  segmenterPromise.catch(() => (segmenterPromise = null));
  return segmenterPromise;
}

/** Warms the model up (e.g. when the background picker opens). */
export const preloadBackgroundEffects = () => loadSegmenter().then(() => true, () => false);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draws `img` to fill w×h, cropping to keep its shape. */
function cover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

/**
 * Returns a new stream: the camera with the chosen background (and the
 * original microphone). Stop it to release the canvas and timers.
 */
export async function applyBackground(input: MediaStream, choice: Exclude<BackgroundChoice, { kind: "none" }>): Promise<{ stream: MediaStream; stop: () => void }> {
  const track = input.getVideoTracks()[0];
  if (!track) throw new Error("No camera");
  const [segmenter, bgImage] = await Promise.all([loadSegmenter(), choice.kind === "image" ? loadImage(choice.src) : Promise.resolve(null)]);

  const settings = track.getSettings();
  const W = Math.min(960, settings.width ?? 1280);
  const H = Math.round(W * ((settings.height ?? 720) / (settings.width ?? 1280)));

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.srcObject = new MediaStream([track]);
  await video.play();

  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  // The person, cut out with the (softened) mask.
  const person = document.createElement("canvas");
  person.width = W;
  person.height = H;
  const pctx = person.getContext("2d")!;
  const maskCanvas = document.createElement("canvas");
  const mctx = maskCanvas.getContext("2d")!;

  let stopped = false;
  let lastTs = -1;
  const blurPx = choice.kind === "blur" ? (choice.strength === "strong" ? 18 : 8) : 0;

  const frame = () => {
    if (stopped) return;
    if (video.readyState >= 2) {
      const ts = performance.now();
      if (ts > lastTs) {
        lastTs = ts;
        const result = segmenter.segmentForVideo(video, ts);
        const mask = result.confidenceMasks?.[0];
        if (mask) {
          if (maskCanvas.width !== mask.width || maskCanvas.height !== mask.height) {
            maskCanvas.width = mask.width;
            maskCanvas.height = mask.height;
          }
          const data = mask.getAsFloat32Array();
          const img = mctx.createImageData(mask.width, mask.height);
          for (let i = 0; i < data.length; i++) img.data[i * 4 + 3] = Math.min(255, Math.max(0, (data[i]! - 0.25) * 2 * 255));
          mctx.putImageData(img, 0, 0);
          mask.close();
        }
        result.close?.();

        // 1. The new background.
        ctx.save();
        if (choice.kind === "blur") {
          ctx.filter = `blur(${blurPx}px)`;
          ctx.drawImage(video, -blurPx, -blurPx, W + blurPx * 2, H + blurPx * 2);
        } else if (bgImage) cover(ctx, bgImage, W, H);
        ctx.restore();
        // 2. The person on top.
        pctx.globalCompositeOperation = "source-over";
        pctx.clearRect(0, 0, W, H);
        pctx.drawImage(video, 0, 0, W, H);
        pctx.globalCompositeOperation = "destination-in";
        pctx.filter = "blur(2px)";
        pctx.drawImage(maskCanvas, 0, 0, W, H);
        pctx.filter = "none";
        ctx.drawImage(person, 0, 0);
      }
    }
    const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
    if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(frame);
    else requestAnimationFrame(frame);
  };
  frame();

  const outTrack = out.captureStream(30).getVideoTracks()[0]!;
  // Turning the camera off in class disables the source track; mirror it on the output.
  const sync = setInterval(() => (outTrack.enabled = track.enabled && track.readyState === "live"), 250);
  const stream = new MediaStream([outTrack, ...input.getAudioTracks()]);
  return {
    stream,
    stop: () => {
      stopped = true;
      clearInterval(sync);
      outTrack.stop();
      video.pause();
      video.srcObject = null;
    },
  };
}

/**
 * The stream to show for the local camera with a background applied, or the
 * camera itself for "none" — and an error message if effects couldn't start.
 */
export function useBackgroundStream(input: MediaStream | null, choice: BackgroundChoice): { stream: MediaStream | null; loading: boolean; error: string | null } {
  const [state, setState] = useState<{ key: string; stream: MediaStream | null; error: string | null }>({ key: "", stream: null, error: null });
  const key = input ? `${input.id}:${JSON.stringify(choice)}` : "";
  useEffect(() => {
    if (!input || choice.kind === "none") return;
    let live = true;
    let stop: (() => void) | null = null;
    applyBackground(input, choice).then(
      (r) => {
        if (!live) return r.stop();
        stop = r.stop;
        setState({ key, stream: r.stream, error: null });
      },
      () => live && setState({ key, stream: null, error: "Background effects couldn't start on this device. Your normal camera is shown." }),
    );
    return () => {
      live = false;
      stop?.();
    };
  }, [input, key]); // eslint-disable-line react-hooks/exhaustive-deps -- `key` covers `choice`
  if (!input || choice.kind === "none") return { stream: input, loading: false, error: null };
  if (state.key !== key) return { stream: input, loading: true, error: null };
  return { stream: state.stream ?? input, loading: false, error: state.error };
}

// ---------------------------------------------------------------- remembering the choice

const STORE_KEY = (userId: string) => `classproject:background:${userId}`;

/** The teacher's last background, remembered in this browser. */
export function savedBackground(userId: string): BackgroundChoice {
  try {
    const v = JSON.parse(localStorage.getItem(STORE_KEY(userId)) ?? "null") as BackgroundChoice | null;
    return v && (v.kind === "none" || v.kind === "blur" || v.kind === "image") ? v : NO_BACKGROUND;
  } catch {
    return NO_BACKGROUND;
  }
}

export function saveBackground(userId: string, choice: BackgroundChoice) {
  try {
    localStorage.setItem(STORE_KEY(userId), JSON.stringify(choice));
  } catch {
    /* storage full or blocked: the choice just isn't remembered */
  }
}

/** An uploaded picture, shrunk to 1280 px wide JPEG so it can be remembered. */
export async function pictureFromFile(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const w = Math.min(1280, img.width);
    const h = Math.round((w * img.height) / img.width);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    c.getContext("2d")!.drawImage(img, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(url);
  }
}

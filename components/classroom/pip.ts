"use client";

import { initials } from "@/lib/helpers";
import { pipSupported } from "@/components/media/video-player";

/**
 * Picture-in-picture for the live class (spec §32). Real video (camera or a
 * screen share) goes straight into PiP. When the speaker has no video feed —
 * always the case for simulated participants — the speaker tile is drawn onto
 * a canvas and streamed into a hidden <video>, which is what PiP requires.
 */
let pipVideo: HTMLVideoElement | null = null;
let raf = 0;

export async function openClassroomPip(opts: { videoEl: HTMLVideoElement | null; speaker: () => { name: string; color: string; speaking: boolean; title: string; handCount: number } }): Promise<"native" | "canvas" | "unsupported"> {
  if (!pipSupported()) return "unsupported";
  if (document.pictureInPictureElement) {
    await document.exitPictureInPicture();
    return "native";
  }
  if (opts.videoEl && opts.videoEl.srcObject && opts.videoEl.readyState >= 1) {
    await opts.videoEl.requestPictureInPicture();
    return "native";
  }

  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const ctx = canvas.getContext("2d")!;
  const draw = (ts: number) => {
    const s = opts.speaker();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(0, 0, 640, 360);
    const pulse = s.speaking ? 6 + Math.sin(ts / 180) * 4 : 0;
    ctx.beginPath();
    ctx.arc(320, 160, 72 + pulse, 0, Math.PI * 2);
    ctx.fillStyle = s.speaking ? "rgba(34,197,94,0.35)" : "rgba(148,163,184,0.15)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(320, 160, 68, 0, Math.PI * 2);
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "600 52px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(initials(s.name), 320, 162);
    ctx.font = "600 22px system-ui, sans-serif";
    ctx.fillText(s.name, 320, 268);
    ctx.font = "16px system-ui, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText(s.title, 320, 298);
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(28, 28, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.textAlign = "left";
    ctx.font = "600 14px system-ui, sans-serif";
    ctx.fillText("LIVE", 42, 29);
    if (s.handCount > 0) {
      ctx.textAlign = "right";
      ctx.fillText(`✋ ${s.handCount}`, 620, 29);
    }
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  pipVideo ??= Object.assign(document.createElement("video"), { muted: true, playsInline: true });
  pipVideo.srcObject = canvas.captureStream(15);
  await pipVideo.play();
  pipVideo.addEventListener("leavepictureinpicture", () => cancelAnimationFrame(raf), { once: true });
  await pipVideo.requestPictureInPicture();
  return "canvas";
}

export function closeClassroomPip() {
  cancelAnimationFrame(raf);
  if (document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {});
}

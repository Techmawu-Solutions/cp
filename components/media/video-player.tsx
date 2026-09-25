"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Maximize, PictureInPicture2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function pipSupported(): boolean {
  return typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled;
}

/**
 * Toggles picture-in-picture for a <video> (spec §32). Browsers without native
 * PiP (e.g. Firefox, some mobile browsers) get the in-page floating player via
 * `onFallback`.
 */
export function PipButton({ video, onFallback, className, size = "sm", label = true }: { video: () => HTMLVideoElement | null; onFallback?: () => void; className?: string; size?: "sm" | "icon" | "icon-sm"; label?: boolean }) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    const v = video();
    if (!v) return;
    const on = () => setActive(true);
    const off = () => setActive(false);
    v.addEventListener("enterpictureinpicture", on);
    v.addEventListener("leavepictureinpicture", off);
    return () => {
      v.removeEventListener("enterpictureinpicture", on);
      v.removeEventListener("leavepictureinpicture", off);
    };
  }, [video]);

  const toggle = async () => {
    const v = video();
    if (!v) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (pipSupported()) {
        if (v.readyState < 1) await new Promise((r) => v.addEventListener("loadedmetadata", r, { once: true }));
        await v.requestPictureInPicture();
      } else onFallback?.();
    } catch {
      onFallback?.();
    }
  };

  return (
    <Button type="button" variant="secondary" size={size} className={className} onClick={toggle} aria-pressed={active} title="Picture-in-picture">
      <PictureInPicture2 />
      {label && size === "sm" && (active ? "Exit PiP" : "Picture-in-picture")}
    </Button>
  );
}

export interface VideoPlayerHandle {
  video: HTMLVideoElement | null;
}

/**
 * Platform video player for lessons and recordings. Adds picture-in-picture
 * and fullscreen, and falls back to a floating in-page mini-player.
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, { src: string; poster?: string; title?: string; className?: string; onPlay?: () => void; onEnded?: () => void }>(function VideoPlayer({ src, poster, title, className, onPlay, onEnded }, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [floating, setFloating] = useState(false);
  useImperativeHandle(ref, () => ({ video: videoRef.current }), []);

  return (
    <div className={cn("space-y-2", className)}>
      <div className={cn(floating ? "fixed right-4 bottom-4 z-50 w-72 overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/20 sm:w-96" : "relative overflow-hidden rounded-xl bg-black")}>
        {floating && (
          <div className="flex items-center justify-between bg-black/85 px-2 py-1 text-xs text-white">
            <span className="truncate">{title ?? "Now playing"}</span>
            <button onClick={() => setFloating(false)} className="rounded p-0.5 hover:bg-white/20" aria-label="Close mini player">
              <X className="size-3.5" />
            </button>
          </div>
        )}
        <video ref={videoRef} src={src} poster={poster} controls playsInline className="aspect-video w-full bg-black" onPlay={onPlay} onEnded={onEnded} />
      </div>
      {floating && <div className="flex aspect-video items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Playing in the mini player</div>}
      <div className="flex flex-wrap gap-2">
        <PipButton video={() => videoRef.current} onFallback={() => setFloating((f) => !f)} />
        <Button type="button" variant="ghost" size="sm" onClick={() => videoRef.current?.requestFullscreen?.()}>
          <Maximize /> Fullscreen
        </Button>
      </div>
    </div>
  );
});

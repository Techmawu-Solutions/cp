"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { html5Engine, vimeoEngine, youtubeEngine } from "@/components/interactive-video/engines";
import type { PlayerEngine } from "@/lib/interactive-video/player";
import type { VideoAsset } from "@/lib/types";

/** Renders the asset with the right adapter and hands its PlayerEngine up. */
export function VideoSurface({ asset, startAt = 0, onEngine, protect }: { asset: Pick<VideoAsset, "provider" | "url" | "providerRef" | "captions" | "title">; startAt?: number; onEngine: (e: PlayerEngine | null) => void; protect?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const { provider, url, providerRef } = asset;
  const start = useRef(startAt);

  useEffect(() => {
    let engine: PlayerEngine | null = null;
    if (provider === "file" && video.current) engine = html5Engine(video.current);
    else if (provider === "youtube" && providerRef && host.current) engine = youtubeEngine(host.current, providerRef, { start: start.current });
    else if (provider === "vimeo" && providerRef && host.current) engine = vimeoEngine(host.current, providerRef, { start: start.current });
    onEngine(engine);
    return () => {
      engine?.destroy();
      onEngine(null);
    };
  }, [provider, url, providerRef, onEngine]);

  if (provider === "file")
    return (
      <video
        ref={video}
        src={url}
        title={asset.title}
        playsInline
        preload="metadata"
        crossOrigin={asset.captions?.length ? "anonymous" : undefined}
        className="absolute inset-0 size-full bg-black object-contain"
        controlsList={protect ? "nodownload noremoteplayback" : undefined}
        disablePictureInPicture={protect}
        onContextMenu={protect ? (e) => e.preventDefault() : undefined}
      >
        {asset.captions?.map((c) => <track key={c.language} kind="captions" srcLang={c.language} label={c.label} src={c.url} default={c.isDefault} />)}
      </video>
    );
  if (provider === "youtube" || provider === "vimeo") return <div ref={host} className="absolute inset-0 [&_iframe]:size-full" />;
  return null;
}

/** True on screens at least `px` wide. False on the server and before hydration. */
export function useMinWidth(px: number): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(`(min-width: ${px}px)`);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(`(min-width: ${px}px)`).matches,
    () => false,
  );
}

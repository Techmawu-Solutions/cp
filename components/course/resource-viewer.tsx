"use client";

import { useState } from "react";
import { ExternalLink, ShieldOff, Loader2 } from "lucide-react";
import { LinkButton } from "@/components/common/link-button";

/** Hosts known to forbid framing via X-Frame-Options / CSP frame-ancestors. */
const BLOCKED = ["google.com/search", "github.com", "facebook.com", "twitter.com", "x.com", "linkedin.com", "instagram.com", "developer.mozilla.org", "bbc.com", "stackoverflow.com"];

export function toEmbedUrl(raw: string): { url: string; provider: "youtube" | "vimeo" | "google" | "generic" } {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return { url: `https://www.youtube-nocookie.com/embed/${id}`, provider: "youtube" };
    }
    if (host === "youtu.be") return { url: `https://www.youtube-nocookie.com/embed${u.pathname}`, provider: "youtube" };
    if (host === "vimeo.com" && /^\/\d+/.test(u.pathname)) return { url: `https://player.vimeo.com/video${u.pathname}`, provider: "vimeo" };
    if (host === "docs.google.com") return { url: raw.replace(/\/(edit|view)(\?.*)?$/, "/preview"), provider: "google" };
    if (host === "drive.google.com") return { url: raw.replace(/\/view(\?.*)?$/, "/preview"), provider: "google" };
  } catch {
    /* fall through */
  }
  return { url: raw, provider: "generic" };
}

export function isBlocked(raw: string) {
  const bare = raw.replace(/^https?:\/\/(www\.)?/, "");
  return BLOCKED.some((b) => bare.startsWith(b));
}

/**
 * External Resource Viewer (spec §27). Browsers don't reliably report when a
 * frame is refused, so known-blocking sites get the fallback immediately and
 * everything else is attempted with the "Open in New Tab" escape hatch visible.
 */
export function ResourceViewer({ url, title }: { url: string; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const embed = toEmbedUrl(url);
  const blocked = embed.provider === "generic" && isBlocked(url);

  if (blocked)
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/30 px-6 py-16 text-center">
        <ShieldOff className="size-8 text-muted-foreground" />
        <p className="mt-3 font-medium">This resource cannot be displayed inside the classroom.</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{new URL(url).hostname} doesn&apos;t allow other sites to show its pages.</p>
        <LinkButton href={url} target="_blank" rel="noreferrer" className="mt-4">
          <ExternalLink /> Open in New Tab
        </LinkButton>
      </div>
    );

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-xl border bg-muted/20">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={embed.url}
          title={title}
          onLoad={() => setLoaded(true)}
          className={embed.provider === "generic" || embed.provider === "google" ? "h-[70vh] w-full" : "aspect-video w-full"}
          sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
          allow="fullscreen; picture-in-picture; encrypted-media"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>If the resource doesn&apos;t appear, the site may not allow being shown inside the classroom.</span>
        <LinkButton href={url} target="_blank" rel="noreferrer" size="sm" variant="outline">
          <ExternalLink /> Open in New Tab
        </LinkButton>
      </div>
    </div>
  );
}

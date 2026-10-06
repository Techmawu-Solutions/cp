/**
 * The address to show a link in a frame, and who serves it (spec section 27).
 * Safe to call on a link that is already an embed address: the result is the
 * same, so the provider is never lost. That matters because YouTube and Vimeo
 * refuse to play without the page's origin as referrer (YouTube's "error 153"),
 * and only recognised providers get it.
 */
export type EmbedProvider = "youtube" | "vimeo" | "google" | "generic";

const YT = (id: string, start?: string | null) => `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${parseInt(start, 10) || 0}` : ""}`;

export function toEmbedUrl(raw: string): { url: string; provider: EmbedProvider } {
  try {
    const u = new URL(raw.trim());
    const host = u.hostname.replace(/^(www\.|m\.)/, "");
    const start = u.searchParams.get("t") ?? u.searchParams.get("start");
    if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "music.youtube.com") {
      const id = u.searchParams.get("v") ?? /^\/(?:embed|shorts|live|v)\/([\w-]{6,})/.exec(u.pathname)?.[1];
      if (id) return { url: YT(id, start), provider: "youtube" };
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      if (id) return { url: YT(id, start), provider: "youtube" };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = /\/(\d{5,})/.exec(u.pathname)?.[1];
      if (id) return { url: `https://player.vimeo.com/video/${id}`, provider: "vimeo" };
    }
    if (host === "docs.google.com") return { url: raw.replace(/\/(edit|view)(\?.*)?$/, "/preview"), provider: "google" };
    if (host === "drive.google.com") return { url: raw.replace(/\/view(\?.*)?$/, "/preview"), provider: "google" };
  } catch {
    /* not a URL: shown as given */
  }
  return { url: raw, provider: "generic" };
}

"use client";

import { unzipSync } from "fflate";
import { loadUpload } from "@/lib/file-registry";
import { parseManifest, ScormPackageError, type ScormManifest } from "@/lib/scorm/manifest";

/**
 * SCORM packages in the prototype (spec section 26.2): the uploaded .zip is kept in
 * the browser (like other uploads) and unpacked into Cache Storage, where a
 * service worker serves it at /scorm-content/<packageId>/… so the package runs
 * with its relative links intact. In production the package is unpacked to
 * object storage and served from a content domain.
 */
const CACHE = "classproject-scorm-v1";
export const scormBase = (packageId: string) => `/scorm-content/${packageId}/`;

const MIME: Record<string, string> = {
  html: "text/html", htm: "text/html", js: "text/javascript", mjs: "text/javascript", css: "text/css", json: "application/json", xml: "application/xml", xsd: "application/xml",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", svg: "image/svg+xml", webp: "image/webp", ico: "image/x-icon",
  mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", m4a: "audio/mp4",
  woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", eot: "application/vnd.ms-fontobject",
  pdf: "application/pdf", txt: "text/plain", swf: "application/x-shockwave-flash",
};
const mimeOf = (path: string) => MIME[path.split(".").pop()!.toLowerCase()] ?? "application/octet-stream";

/** Reads a SCORM zip: finds imsmanifest.xml (at the root, or in a single top folder) and parses it. */
export function readPackage(zip: Uint8Array): { manifest: ScormManifest; files: Record<string, Uint8Array> } {
  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(zip);
  } catch {
    throw new ScormPackageError("That file isn't a valid .zip package.");
  }
  const manifestPath = Object.keys(entries).filter((p) => /(^|\/)imsmanifest\.xml$/i.test(p)).sort((a, b) => a.length - b.length)[0];
  if (!manifestPath) throw new ScormPackageError("No imsmanifest.xml found — this isn't a SCORM package.");
  const root = manifestPath.slice(0, manifestPath.length - "imsmanifest.xml".length);
  const files: Record<string, Uint8Array> = {};
  for (const [p, data] of Object.entries(entries)) if (p.startsWith(root) && !p.endsWith("/")) files[p.slice(root.length)] = data;
  const manifest = parseManifest(new TextDecoder().decode(files["imsmanifest.xml"]!));
  for (const sco of manifest.scos) {
    const path = decodeURIComponent(sco.href.split(/[?#]/)[0]!);
    if (!files[path]) throw new ScormPackageError(`The launch file “${path}” is missing from the package.`);
  }
  return { manifest, files };
}

let registration: Promise<ServiceWorkerRegistration | null> | null = null;

/** Registers the SCORM file server and waits until it is active. */
export function ensureScormServer(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return Promise.resolve(null);
  registration ??= (async () => {
    try {
      const reg = await navigator.serviceWorker.register("/scorm-content/sw.js", { scope: "/scorm-content/" });
      const worker = reg.active ?? reg.waiting ?? reg.installing;
      if (worker && worker.state !== "activated")
        await new Promise<void>((resolve) => {
          const on = () => worker.state === "activated" && (worker.removeEventListener("statechange", on), resolve());
          worker.addEventListener("statechange", on);
          on();
        });
      return reg;
    } catch {
      return null;
    }
  })();
  return registration;
}

/** Writes a package's files where the player can load them. */
export async function installPackage(packageId: string, files: Record<string, Uint8Array>) {
  const cache = await caches.open(CACHE);
  const base = location.origin + scormBase(packageId);
  await Promise.all(
    Object.entries(files).map(([path, data]) =>
      cache.put(base + path.split("/").map(encodeURIComponent).join("/"), new Response(new Blob([data as BlobPart]), { headers: { "Content-Type": mimeOf(path) } })),
    ),
  );
}

export async function isInstalled(packageId: string, launchPath: string) {
  if (typeof caches === "undefined") return false;
  const cache = await caches.open(CACHE);
  return !!(await cache.match(location.origin + scormBase(packageId) + launchPath.split(/[?#]/)[0]));
}

/**
 * Makes sure a package can be played in this browser: unpacks it from the
 * stored upload, or downloads it from its URL (seeded sample packages).
 */
export async function preparePackage(packageId: string, launchPath: string, sourceUrl?: string): Promise<"ready" | "missing" | "unsupported"> {
  const reg = await ensureScormServer();
  if (!reg || typeof caches === "undefined") return "unsupported";
  if (await isInstalled(packageId, launchPath)) return "ready";
  let zip: Uint8Array | null = null;
  const stored = await loadUpload(packageId);
  const src = stored ?? sourceUrl;
  if (src) {
    try {
      zip = new Uint8Array(await (await fetch(src)).arrayBuffer());
    } catch {
      zip = null;
    }
  }
  if (!zip) return "missing";
  const { files } = readPackage(zip);
  await installPackage(packageId, files);
  return "ready";
}

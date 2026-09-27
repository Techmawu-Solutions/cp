/*
 * Serves unpacked SCORM packages at /scorm-content/<packageId>/<path> from the
 * browser's Cache Storage, so a package's HTML, scripts, styles and media load
 * with their relative links intact inside the in-app player (spec §26.2).
 * The page writes the files into the cache when a package is uploaded or opened.
 */
const CACHE = "classproject-scorm-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith("/scorm-content/") || url.pathname.endsWith("/sw.js")) return;
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      // Match on the path only: launch URLs may carry a query string.
      const hit = await cache.match(url.origin + url.pathname);
      if (hit) return hit;
      return new Response("This SCORM file isn't loaded in this browser. Close and reopen the lesson.", { status: 404, headers: { "Content-Type": "text/plain" } });
    })(),
  );
});

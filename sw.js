/* My Notes — service worker: offline app shell + library cache */
const CACHE = "mynotes-v1";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon.svg"];

self.addEventListener("install", e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  // never cache Graph API or auth traffic
  if (url.hostname.includes("graph.microsoft.com") ||
      url.hostname.includes("login.microsoftonline.com") ||
      url.hostname.includes("login.live.com")) return;

  if (e.request.mode === "navigate"){
    // pages: network first so updates arrive, cache fallback for offline
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // static assets & CDN libraries: cache first, refresh in background
  e.respondWith(
    caches.match(e.request).then(hit => {
      const refresh = fetch(e.request).then(r => {
        if (r.ok){ const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
        return r;
      }).catch(() => hit);
      return hit || refresh;
    })
  );
});

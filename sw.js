// sw.js — app-shell cache. Numbers-only privacy; never caches video.
// NETWORK-FIRST for the same-origin shell so a deploy always reaches the
// installed PWA (cache is only the offline fallback) — the Gata stale-SW lesson.
const CACHE = "swish-v2";
const SHELL = [
  "./",
  "./index.html",
  "./css/app.css",
  "./js/app.js",
  "./js/pose.js",
  "./js/analyze.js",
  "./js/store.js",
  "./js/drills.js",
  "./js/ai.js",
  "./js/coaches.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // let the CDN (MediaPipe) hit the network

  // network-first: fresh code wins, cache is the offline fallback.
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
  );
});

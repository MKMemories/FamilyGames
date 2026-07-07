/* Service worker KHELIJ — app installable + hors-ligne après la 1re visite.
   Navigation : réseau d'abord (fraîcheur) puis cache (secours hors-ligne).
   Assets même-origine (JS/CSS/images/dict) : cache d'abord puis réseau. */
const CACHE = "khelij-v4";
const CORE = ["/", "/index.html", "/manifest.webmanifest", "/favicon.svg", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()).catch(() => {}));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // laisser passer polices/CDN/Firebase

  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match("/index.html")))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then((m) => {
      if (m) return m;
      return fetch(req).then((r) => {
        if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
        return r;
      });
    })
  );
});

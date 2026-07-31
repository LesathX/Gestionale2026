/* Gestionale CAMI – Service Worker PWA v2 */
const CACHE = "cami-pwa-v2";
const PRECACHE = ["./manifest.webmanifest","./icon-192.png","./icon-512.png","./apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  /* Mai intercettare API esterne */
  if (
    url.hostname.includes("supabase") ||
    url.hostname.includes("emailjs") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("gstatic") ||
    url.hostname.includes("cdn") ||
    url.hostname.includes("jsdelivr") ||
    url.hostname.includes("unpkg") ||
    url.hostname.includes("cdnjs") ||
    url.hostname.includes("sheetjs")
  ) {
    return;
  }

  /* HTML: sempre rete prima, senza bloccare se offline fallisce */
  const isDoc = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isDoc) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          try {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          } catch (e) {}
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match(req)))
    );
    return;
  }

  /* statici: cache poi rete */
  event.respondWith(
    caches.match(req).then((cached) => {
      const net = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            try {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            } catch (e) {}
          }
          return res;
        })
        .catch(() => cached);
      return cached || net;
    })
  );
});

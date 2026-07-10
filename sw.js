// Banetæller Build003 Stable
// Ingen cache under udvikling.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.map(name => caches.delete(name))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", () => {
  // Browseren henter altid de aktuelle filer.
});

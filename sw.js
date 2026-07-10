const CACHE_NAME = "banetaeller-build001-v2";

const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./settings.js",
  "./utils.js",
  "./voice.js",
  "./gpx.js",
  "./gps.js",
  "./lapEngine.js",
  "./app.js",
  "./manifest.json",
  "./banen.gpx"
];

// Gem de vigtigste filer og aktivér den nye version straks
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES))
  );
});

// Slet alle gamle Banetæller-caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames =>
        Promise.all(
          cacheNames
            .filter(name => name !== CACHE_NAME)
            .map(name => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Hent altid den nyeste side og kode fra nettet først
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        const responseCopy = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then(cache => cache.put(event.request, responseCopy));

        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
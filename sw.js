const CACHE_NAME="banetaeller-build001-v1";
const FILES=[
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

self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES)));
});

self.addEventListener("fetch",event=>{
  event.respondWith(caches.match(event.request).then(response=>response || fetch(event.request)));
});

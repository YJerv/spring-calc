/* Helical Spring Designer service worker — cache app shell for offline use */
const CACHE = "spring-calc-v17";
const ASSETS = [
  "./",
  "./index.html",
  "./css/app.css",
  "./vendor/jspdf.umd.min.js",
  "./js/theme.js",
  "./js/help.js",
  "./js/engine.js",
  "./js/en15800.js",
  "./js/charts.js",
  "./js/drawing.js",
  "./js/entitlement.js",
  "./js/pdf.js",
  "./js/app.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(ASSETS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (key) {
        if (key !== CACHE) return caches.delete(key);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) return cached;
      return fetch(event.request).then(function (response) {
        var copy = response.clone();
        if (response.ok && new URL(event.request.url).origin === location.origin) {
          caches.open(CACHE).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      }).catch(function () {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});

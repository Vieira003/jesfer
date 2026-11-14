
const CACHE_NAME = "jesfer-mobile-v1";

const ARQUIVOS = [
  "/mobile/icons/icon-192.png",
  "/mobile/icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ARQUIVOS);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then(async (nomes) => {
      await Promise.all(
        nomes
          .filter((nome) => nome !== CACHE_NAME)
          .map((nome) => caches.delete(nome))
      );

      await self.clients.claim();
    })
  );
});

const CACHE_NAME = 'ekwato-v1';

// Instalación básica del Service Worker
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

// Activación
self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Interceptar peticiones para que funcione online sin bloqueos
self.addEventListener('fetch', (e) => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
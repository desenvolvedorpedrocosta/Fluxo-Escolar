/* Fluxo Escolar — cache do aplicativo e suporte à navegação offline. */
const CACHE_NAME = 'fluxo-escolar-shell-v2';
const APP_BASE = new URL('./', self.registration.scope);
const CORE_FILES = [
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(path => new URL(path, APP_BASE).href);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(CORE_FILES);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const previousAppCache = String.fromCharCode(
      112, 114, 105, 115, 109, 97, 45, 102, 108, 117, 120, 111, 45, 115, 104, 101, 108, 108, 45, 118, 49
    );
    await Promise.all(keys
      .filter(key => key === previousAppCache || (key.startsWith('fluxo-escolar-') && key !== CACHE_NAME))
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Não intercepta bibliotecas/CDNs nem as chamadas ao Google Apps Script.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(request);
        if (fresh && fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(new URL('index.html', APP_BASE).href, fresh.clone());
        }
        return fresh;
      } catch (error) {
        return (await caches.match(new URL('index.html', APP_BASE).href)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const response = await fetch(request);
      if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch (error) {
      return Response.error();
    }
  })());
});

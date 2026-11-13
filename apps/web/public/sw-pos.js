/**
 * Hanva POS & Captain PWA Service Worker (sw-pos.js)
 * Caches shell assets, app routes (/pos, /captain), and static bundles
 * Provides offline navigation and fast loading
 */

const CACHE_NAME = 'hanva-pos-shell-v2';

// Key shell assets to pre-cache on install
const PRECACHE_ASSETS = [
  '/pos',
  '/captain',
  '/captain/manifest.webmanifest',
  '/captain-logo.png',
  '/captain-apple-icon.png',
  '/icons/captain-192.png',
  '/icons/captain-512.png',
  '/icons/captain-96.png',
  '/brand-lockup.png',
  '/hanva-logo.png',
  '/logo.png',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// Install Event: pre-cache core application shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
      .catch((err) => {
        console.warn('[SW-POS] Pre-caching encountered an error:', err);
      }),
  );
});

// Activate Event: clear old cache versions and claim immediate control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        );
      })
      .then(() => {
        return self.clients.claim();
      }),
  );
});

// Fetch Event: handle requests with Cache-First or Stale-While-Revalidate strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept GET requests and standard HTTP/HTTPS schemes
  if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
    return;
  }

  // Never cache API calls in SW — managed by application layer & IndexedDB
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // 1. Static Assets (Next.js chunks, fonts, images, css, js)
  // Strategy: Cache-First with background revalidation
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|gif|woff2?|ttf|eot|ico|css|js)$/)
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // In background, fetch fresh copy to keep cache up to date
          fetch(request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(request, networkResponse);
                });
              }
            })
            .catch(() => {
              // Ignore background fetch failure when offline
            });
          return cachedResponse;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      }),
    );
    return;
  }

  // 2. Navigation / HTML pages (e.g. /pos, /captain)
  // Strategy: Stale-While-Revalidate with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Network failed: attempt to serve cached page
          const cached = await caches.match(request);
          if (cached) return cached;

          // Route fallback for /pos and /captain
          if (url.pathname.startsWith('/pos')) {
            const posFallback = await caches.match('/pos');
            if (posFallback) return posFallback;
          }

          if (url.pathname.startsWith('/captain')) {
            const captainFallback = await caches.match('/captain');
            if (captainFallback) return captainFallback;
          }

          return new Response(
            '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Offline - Hanva POS</title></head><body style="font-family:sans-serif;text-align:center;padding:40px;background:#09090b;color:#f4f4f5"><h2>⚡ POS Offline</h2><p>This page was not previously cached. Please connect to internet to load initial assets.</p></body></html>',
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            },
          );
        }),
    );
    return;
  }
});

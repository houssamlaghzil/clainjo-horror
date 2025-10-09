// Service Worker pour Clainjo Horror PWA
// Version: 1.0.0
const CACHE_VERSION = 'clainjo-horror-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets statiques à mettre en cache lors de l'installation
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/android-chrome-192x192.png',
  '/icons/android-chrome-512x512.png'
];

// Taille maximale du cache dynamique
const MAX_DYNAMIC_CACHE_SIZE = 50;
const MAX_API_CACHE_SIZE = 20;

// ============================================
// INSTALLATION
// ============================================
self.addEventListener('install', (event) => {
  console.log('[SW] install', CACHE_VERSION);
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ============================================
// ACTIVATION
// ============================================
self.addEventListener('activate', (event) => {
  console.log('[SW] activate', CACHE_VERSION);
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names
          .filter((n) => n.startsWith('clainjo-horror-') && n !== STATIC_CACHE && n !== DYNAMIC_CACHE && n !== API_CACHE)
          .map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

// ============================================
// FETCH - stratégies de cache
// ============================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Non-GET -> réseau direct
  if (request.method !== 'GET') return;

  // Ignorer Socket.IO / WebSocket
  if (url.pathname.startsWith('/socket.io/') || url.protocol === 'ws:' || url.protocol === 'wss:') return;

  // API -> Network First avec cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, API_CACHE, MAX_API_CACHE_SIZE));
    return;
  }

  // Assets statiques -> Cache First
  if (isStatic(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation/HTML -> Network First
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE));
    return;
  }

  // Par défaut -> Network First
  event.respondWith(networkFirst(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE));
});

// ============================================
// STRATÉGIES
// ============================================
async function cacheFirst(request, cacheName) {
  try {
    const cached = await caches.match(request);
    if (cached) return cached;
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch (e) {
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName, maxSize) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
      if (maxSize) limitCacheSize(cacheName, maxSize);
    }
    return res;
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return caches.match('/offline.html') || new Response('Offline', { status: 503 });
  }
}

async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxSize) {
    await cache.delete(keys[0]);
    return limitCacheSize(cacheName, maxSize);
  }
}

function isStatic(pathname) {
  const exts = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.gif', '.webp', '.woff', '.woff2', '.ttf', '.eot'];
  return exts.some((ext) => pathname.endsWith(ext));
}

// ============================================
// MESSAGES (skip waiting, clear cache)
// ============================================
self.addEventListener('message', (event) => {
  if (event?.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event?.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
    );
  }
});

// ============================================
// SYNC (optionnel)
// ============================================
self.addEventListener('sync', (event) => {
  // placeholder
});

// ============================================
// NOTIFICATIONS PUSH (optionnel)
// ============================================
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nouvelle notification',
    icon: '/icons/android-chrome-192x192.png',
    badge: '/icons/android-chrome-192x192.png',
    vibrate: [200, 100, 200],
    tag: 'clainjo-notification',
    requireInteraction: false
  };
  event.waitUntil(self.registration.showNotification('Clainjo - Inaca Blood', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

console.log('[SW] prêt', CACHE_VERSION);

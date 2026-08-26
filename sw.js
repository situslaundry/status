const CACHE_NAME = 'statusapp-v1.0.0';
const STATIC_ASSETS = [
  './',
  './index.html',
  './login.html',
  './register.html',
  './profile.html',
  './create.html',
  './status.html',
  './404.html',
  './css/style.css',
  './css/responsive.css',
  './js/firebase-config.js',
  './js/utils.js',
  './js/auth.js',
  './js/app.js',
  './js/feed.js',
  './js/status.js',
  './js/profile.js',
  './js/create-status.js',
  './js/comments.js',
  './assets/logo.svg',
  './assets/default-avatar.svg',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// Network-First untuk permintaan non-static, Cache-First untuk static assets lokal
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Jangan cache request Firestore/Storage API agar data tidak stale
  if (
    requestUrl.origin.includes('firestore.googleapis.com') ||
    requestUrl.origin.includes('firebasestorage.googleapis.com') ||
    requestUrl.origin.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

// Stance Service Worker — enables PWA install + file handling
const CACHE_NAME = 'sharez-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Basic fetch handler — network first, no aggressive caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

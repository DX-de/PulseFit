const CACHE = 'pulsefit-saas-v6';
const IS_LOCAL = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

const ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/favicon.svg',
];

const NETWORK_ONLY = [
  '/js/',
  '/pulsefit-',
  '/app/',
  '/config.js',
  '/login/',
  '/register/',
  '/profile/',
  '/dashboard/',
  '/calendar/',
  '/journal/',
  '/history/',
  '/program/',
  '/nutrition/',
  '/ai-coach/',
  '/community/',
  '/pricing/',
  '/upgrade/',
  '/admin/',
  '/forgot-password/',
];

function isNetworkOnly(url) {
  const p = url.pathname;
  return NETWORK_ONLY.some((prefix) => p.includes(prefix) || url.href.includes(prefix));
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);

  if (IS_LOCAL || isNetworkOnly(url)) {
    e.respondWith(fetch(e.request));
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return res;
    }).catch(() => cached))
  );
});

self.addEventListener('push', (e) => {
  let data = { title: 'PulseFit', body: 'Votre coach vous attend.' };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) { /* ignore */ }
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'pulsefit-push',
      data: { url: data.url || '/dashboard/' },
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/dashboard/';
  e.waitUntil(clients.openWindow(url));
});

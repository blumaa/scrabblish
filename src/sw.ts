/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

// Precache app shell (injected by vite-plugin-pwa at build time)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime cache for dictionary files — StaleWhileRevalidate so updates arrive next load
registerRoute(
  ({ url }) => url.pathname.startsWith('/dictionaries/'),
  new StaleWhileRevalidate({ cacheName: 'dictionaries' }),
);

// Web Push notification handlers
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Scrabblish';
  const options: NotificationOptions = {
    body: data.body || "It's your turn!",
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string })?.url || '/';
  event.waitUntil(self.clients.openWindow(url));
});

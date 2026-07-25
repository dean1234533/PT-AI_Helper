// Dedicated service worker for Firebase Cloud Messaging push delivery.
// Registered at a dummy sub-scope (see usePushNotifications.js) so it never
// competes with the Workbox-generated PWA service worker for scope '/'.
// Not part of the Vite build — plain script, Firebase web config values are
// public (not secrets), so they're hardcoded here to match src/firebase/config.js.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyChl8It5ayupmXLsQObhkE2Ef_rmiqDSU4',
  authDomain: 'pt-ai-helper.firebaseapp.com',
  projectId: 'pt-ai-helper',
  storageBucket: 'pt-ai-helper.firebasestorage.app',
  messagingSenderId: '259024965773',
  appId: '1:259024965773:web:781bdf96745e549950d2c4',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, url } = payload.notification
    ? { title: payload.notification.title, body: payload.notification.body, url: payload.data?.url }
    : { title: payload.data?.title, body: payload.data?.body, url: payload.data?.url };

  self.registration.showNotification(title || "DB's Workouts", {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: url || '/' },
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

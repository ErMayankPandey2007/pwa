// Firebase Cloud Messaging Service Worker for Vidyak PWA
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Real Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDAk7btG-dpz1dZiUVQbTBQJJHr07LPn-E",
  authDomain: "device-streaming-3d1aacd5.firebaseapp.com",
  projectId: "device-streaming-3d1aacd5",
  storageBucket: "device-streaming-3d1aacd5.firebasestorage.app",
  messagingSenderId: "726097401892",
  appId: "1:726097401892:web:3271125037d83381d260b1"
};

try {
  if (firebase.apps.length === 0) {
    firebase.initializeApp(firebaseConfig);
  }
} catch (e) {
  console.warn('[FCM SW] Firebase init error:', e);
}

let messaging = null;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.warn('[FCM SW] Messaging init error:', e);
}

// Background push notification handler
if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const title = payload.notification?.title || payload.data?.title || 'New Notification';
    const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
    const icon = payload.notification?.icon || payload.data?.imageUrl || '/logo.png';
    const image = payload.notification?.image || payload.data?.imageUrl;
    const actionUrl = payload.data?.actionUrl || payload.data?.click_action || payload.fcmOptions?.link || '/notifications';

    const notificationOptions = {
      body,
      icon,
      image: image || undefined,
      badge: '/logo.png',
      vibrate: [200, 100, 200],
      tag: payload.data?.notificationId || 'vidyak-notification',
      renotify: true,
      data: {
        url: actionUrl,
        rawPayload: payload,
      },
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'close', title: 'Dismiss' }
      ]
    };

    return self.registration.showNotification(title, notificationOptions);
  });
}

// Push notification click listener
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

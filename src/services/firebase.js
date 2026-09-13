import React from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { api } from './api';
import { toast } from 'react-toastify';

// Firebase Client Configuration
// Reads from Vite environment variables with graceful fallback
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDAk7btG-dpz1dZiUVQbTBQJJHr07LPn-E",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "device-streaming-3d1aacd5.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "device-streaming-3d1aacd5",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "device-streaming-3d1aacd5.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "726097401892",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:726097401892:web:3271125037d83381d260b1",
};

// VAPID Public Key for Web Push
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BLqi31E2ot1ukfkmxam2dqCGptT3PnthMyuHkt6NQstph0dAYUk7MN5LsJhRR3_7fPW0XPfyviUHQ4NcfBRpP9Q";

let firebaseApp = null;
let messagingInstance = null;

/**
 * Initialize Firebase App singleton
 */
export function getFirebaseApp() {
  if (!firebaseApp) {
    const existing = getApps();
    if (existing.length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(firebaseConfig);
    }
  }
  return firebaseApp;
}

/**
 * Check if Push Notifications and Firebase Messaging are supported in current browser
 */
export async function isPushSupported() {
  if (typeof window === 'undefined') return false;
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
}

/**
 * Get current browser notification permission status
 */
export function getNotificationPermissionStatus() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission; // 'granted' | 'denied' | 'default'
}

/**
 * Get locally stored FCM token
 */
export function getStoredFcmToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('vidyak_fcm_token');
}

/**
 * Initialize messaging instance
 */
export async function getFirebaseMessaging() {
  if (messagingInstance) return messagingInstance;
  
  const supported = await isPushSupported();
  if (!supported) return null;

  try {
    const app = getFirebaseApp();
    messagingInstance = getMessaging(app);
    return messagingInstance;
  } catch (err) {
    console.warn('[FCM] Messaging init error:', err);
    return null;
  }
}

/**
 * Request notification permission, register service worker, acquire FCM Token,
 * and automatically synchronize the token with the backend.
 */
export async function requestFcmToken(options = { showToasts: false }) {
  const supported = await isPushSupported();
  if (!supported) {
    if (options.showToasts) {
      toast.warn('Push notifications are not supported on this browser/device.');
    }
    return { success: false, error: 'Push notifications not supported' };
  }

  try {
    // 1. Request Browser Permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      if (options.showToasts) {
        toast.info('Notification permission was not granted.');
      }
      return { success: false, permission, error: 'Permission not granted' };
    }

    // 2. Register / retrieve Service Worker
    let swRegistration = null;
    if ('serviceWorker' in navigator) {
      swRegistration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
        scope: '/',
      }).catch((swErr) => {
        console.warn('[FCM] Service worker registration notice:', swErr);
        return null;
      });

      // Wait until active if registering for first time
      if (swRegistration?.installing) {
        await new Promise((resolve) => {
          swRegistration.installing.addEventListener('statechange', (e) => {
            if (e.target.state === 'activated') resolve();
          });
        });
      }
    }

    // 3. Get Firebase Messaging instance
    const messaging = await getFirebaseMessaging();
    if (!messaging) {
      return { success: false, error: 'Messaging unavailable' };
    }

    // 4. Retrieve FCM Token
    const tokenOptions = {};
    if (VAPID_KEY) tokenOptions.vapidKey = VAPID_KEY;
    if (swRegistration) tokenOptions.serviceWorkerRegistration = swRegistration;

    const currentToken = await getToken(messaging, tokenOptions);

    if (currentToken) {
      // Save locally
      localStorage.setItem('vidyak_fcm_token', currentToken);
      console.log('[FCM] Device Token acquired:', currentToken);

      // Synchronize with backend if user is logged in
      const authToken = api.getToken();
      if (authToken) {
        try {
          await api.registerFcmToken(currentToken);
          console.log('[FCM] Device Token successfully synced with backend.');
        } catch (apiErr) {
          console.warn('[FCM] Token sync with backend delayed:', apiErr.message);
        }
      }

      if (options.showToasts) {
        toast.success('Push notifications successfully enabled!');
      }

      return { success: true, token: currentToken };
    } else {
      if (options.showToasts) {
        toast.warn('Could not generate push token. Please try again.');
      }
      return { success: false, error: 'No registration token available' };
    }
  } catch (err) {
    console.error('[FCM] An error occurred while retrieving token:', err);
    if (options.showToasts) {
      toast.error(`Push notification setup error: ${err.message}`);
    }
    return { success: false, error: err.message };
  }
}

/**
 * Setup Foreground Push Listener
 * Triggers interactive toast and sound/vibration when notification arrives while app is in foreground
 */
export async function setupForegroundFcmListener(onMessageReceived) {
  try {
    const messaging = await getFirebaseMessaging();
    if (!messaging) return () => {};

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground push message received:', payload);

      const title = payload.notification?.title || payload.data?.title || 'New Notification';
      const body = payload.notification?.body || payload.data?.body || payload.data?.message || '';
      const actionUrl = payload.data?.actionUrl || payload.data?.click_action || '/notifications';

      // Also show native system notification if permitted
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: '/logo.png',
            badge: '/logo.png',
            vibrate: [200, 100, 200],
            data: { url: actionUrl }
          });
        }).catch(() => {});
      }

      // Show foreground toast
      toast.info(
        React.createElement(
          'div',
          null,
          React.createElement('p', { className: 'font-extrabold text-sm text-gray-900 leading-tight' }, title),
          body ? React.createElement('p', { className: 'text-xs text-gray-600 mt-0.5 line-clamp-2' }, body) : null
        ),
        {
          autoClose: 5000,
          onClick: () => {
            if (typeof window !== 'undefined' && actionUrl) {
              window.location.href = actionUrl;
            }
          },
        }
      );

      // Trigger custom callback if provided
      if (typeof onMessageReceived === 'function') {
        onMessageReceived(payload);
      }
    });

    return unsubscribe;
  } catch (err) {
    console.warn('[FCM] Foreground listener error:', err);
    return () => {};
  }
}

/**
 * Sync FCM Token whenever user logs in or app resumes
 */
export async function syncFcmTokenIfPermitted() {
  if (typeof window === 'undefined') return;
  if (!('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    const stored = getStoredFcmToken();
    if (stored && api.getToken()) {
      try {
        await api.registerFcmToken(stored);
      } catch {
        // Fallback to re-requesting token
        requestFcmToken({ showToasts: false });
      }
    } else {
      requestFcmToken({ showToasts: false });
    }
  }
}

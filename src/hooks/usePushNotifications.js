import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import app, { db } from '../firebase/config';
import toast from 'react-hot-toast';

const PUSH_SW_SCOPE = '/firebase-cloud-messaging-push-scope/';
const PUSH_SW_URL = '/firebase-messaging-sw.js';

let foregroundListenerAttached = false;

async function attachForegroundListener() {
  if (foregroundListenerAttached) return;
  if (!(await isSupported().catch(() => false))) return;
  foregroundListenerAttached = true;

  const messaging = getMessaging(app);
  onMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.title;
    const body = payload.notification?.body || payload.data?.body;
    if (title) toast(`${title}${body ? ` — ${body}` : ''}`, { icon: '🔔' });
  });
}

// Registers the dedicated FCM service worker, requests a push token, and
// saves it under users/{uid}/fcmTokens/{token}. Safe to call repeatedly —
// getToken() returns the existing token if one is already registered.
export async function registerPush(uid) {
  if (!uid) return null;
  if (!(await isSupported().catch(() => false))) return null;
  if (Notification.permission !== 'granted') return null;

  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn('VITE_FIREBASE_VAPID_KEY is not set — skipping push registration.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register(PUSH_SW_URL, { scope: PUSH_SW_SCOPE });
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) return null;

    await setDoc(doc(db, 'users', uid, 'fcmTokens', token), {
      createdAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    await attachForegroundListener();
    return token;
  } catch (err) {
    console.error('Push registration failed:', err);
    return null;
  }
}

export async function unregisterPush(uid, token) {
  if (!uid || !token) return;
  try { await deleteDoc(doc(db, 'users', uid, 'fcmTokens', token)); } catch { /* ignore */ }
}

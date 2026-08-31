import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './index.css';

// Chrome/Android fires beforeinstallprompt once per page load, often within
// a second or two — well before a logged-in user reaches the InstallBanner
// component (mounted inside the authenticated Layout, after auth+profile
// resolve). Capture it globally as early as possible so it isn't missed.
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  window.__deferredInstallPrompt = e;
});

// One-time hard reset: a service worker registered before the update-polling
// fix below could be stuck permanently serving its own cached snapshot and
// never even check for a newer one — the exact failure mode this file exists
// to prevent, but it can't fix itself retroactively from inside a stale SW.
// Forcibly unregister everything and clear every cache once per device, then
// reload into a completely clean state before registering the current SW.
const PURGE_KEY = 'dbsai_sw_purge_v10_delete_debug';

async function purgeStaleServiceWorkers() {
  // Safari can deny storage access in standalone/private contexts. Never let
  // that stop the application mounting and leave the installed PWA blank.
  try {
    if (localStorage.getItem(PURGE_KEY)) return false;
    localStorage.setItem(PURGE_KEY, '1');
  } catch {
    return false;
  }
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* best-effort */ }
  return true;
}

async function boot() {
  // Never let a production PWA cache control the local design preview. It can
  // otherwise keep serving an old HashRouter build after the routes change.
  if (import.meta.env.DEV) {
    try {
      const regs = await navigator.serviceWorker?.getRegistrations?.() || [];
      await Promise.all(regs.map((registration) => registration.unregister()));
      const keys = 'caches' in window ? await caches.keys() : [];
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch { /* best-effort local cleanup */ }

    ReactDOM.createRoot(document.getElementById('root')).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
    return;
  }

  if (await purgeStaleServiceWorkers()) {
    window.location.reload();
    return;
  }

  // The default injected registerSW.js only registers once and never checks
  // for updates while the app stays open — on installed/standalone PWAs
  // (especially iOS) that means users are stuck on stale code until they
  // manually delete and reinstall. This registers immediately, polls for a
  // new version every few minutes, and reloads once when a new one activates.
  let reloading = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  registerSW({
    immediate: true,
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      setInterval(() => registration.update(), 5 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update();
      });
    },
  });

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

boot().catch((error) => {
  // Cache and service-worker maintenance is optional. If a browser rejects
  // any of it, still mount the live app instead of leaving the launch screen.
  console.error('PWA startup recovery:', error);
  const root = document.getElementById('root');
  if (root) {
    root.replaceChildren();
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
});

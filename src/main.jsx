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

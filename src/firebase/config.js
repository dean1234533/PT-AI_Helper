import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase's own docs are explicit that this client config is not a secret —
// it identifies the project, it doesn't authorize anything (that's what
// Firestore/Storage security rules are for) — so a hardcoded fallback here
// is safe. It exists because Cloudflare Pages' BUILD step (where Vite bakes
// in import.meta.env.VITE_*) reads a different env-var store than the
// `wrangler pages secret put` Functions-runtime secrets: the secret can be
// set and listed correctly while the build still bakes in `undefined`,
// which crashes Firebase init before React ever mounts — on a fresh visit
// (no cached service worker yet) this looks exactly like an infinite
// loading screen, e.g. for a brand-new client opening an invite link. These
// fallbacks make that failure mode impossible regardless of Cloudflare's
// build-var state.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyChl8It5ayupmXLsQObhkE2Ef_rmiqDSU4',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'pt-ai-helper.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'pt-ai-helper',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'pt-ai-helper.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '259024965773',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:259024965773:web:781bdf96745e549950d2c4',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;

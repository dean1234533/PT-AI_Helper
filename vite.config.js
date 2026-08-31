import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Cloudflare Pages sets this automatically at build time — a real, unique
// identifier for "this exact deploy" with zero manual upkeep. Falls back to
// a timestamp for local builds (where it's unset and irrelevant anyway,
// since main.jsx skips the purge entirely in dev).
const BUILD_ID = process.env.CF_PAGES_COMMIT_SHA || String(Date.now());

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: null,
      includeAssets: ['favicon.svg', 'pwa-icon-192.png', 'pwa-icon-512.png'],
      manifest: {
        name: "DB's Workouts",
        short_name: "DB's Workouts",
        description: 'AI-powered nutrition and workout plans',
        start_url: '/dashboard',
        display: 'standalone',
        background_color: '#0b0b0d',
        theme_color: '#0b0b0d',
        orientation: 'portrait-primary',
        icons: [
          { src: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        categories: ['health', 'fitness'],
      },
      workbox: {
        // Cache versioned assets only. HTML navigations must stay on the
        // network because / is the public homepage while /dashboard is the
        // authenticated app. Caching index.html here can swap those pages.
        globPatterns: ['**/*.{js,css,ico,png,svg,woff2}'],
        navigateFallback: null,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
    }),
  ],
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-ui': ['lucide-react', 'react-hot-toast', 'react-helmet-async'],
        },
      },
    },
  },
});

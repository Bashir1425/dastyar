import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const target = 'http://localhost:8000';

/**
 * The SPA is served from the same origin as the API paths it proxies
 * (`/chat`, `/conversations`, …). A browser navigation to `/chat/123`
 * must reach index.html instead of the API, so document requests bypass
 * the proxy. XHR/fetch calls keep the normal `Accept` header and are proxied.
 */
const bypassDocumentNavigation = (req: { headers: Record<string, string | string[] | undefined> }) => {
  const accept = req.headers.accept;
  return typeof accept === 'string' && accept.includes('text/html') ? '/index.html' : undefined;
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': { target, changeOrigin: true },
      '/chat': { target, changeOrigin: true, bypass: bypassDocumentNavigation },
      '/conversations': { target, changeOrigin: true, bypass: bypassDocumentNavigation },
      '/profile': { target, changeOrigin: true, bypass: bypassDocumentNavigation },
      '/health': { target, changeOrigin: true },
    },
  },
  preview: { port: 4173 },
  build: { outDir: 'dist', sourcemap: false },
});

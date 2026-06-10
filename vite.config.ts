import path from 'path';
import { defineConfig } from 'vite';

// NOTE: the Gemini API key is deliberately NOT injected into the client
// bundle. Server-side calls go through the Vercel functions in /api, which
// read GEMINI_API_KEY from the server environment. Users can alternatively
// provide their own key at runtime via the in-app Settings menu.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});

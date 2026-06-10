# Configuration Guide

## API Key Configuration

The Gemini API key is **never** compiled into the client bundle. `vite.config.ts` contains no `define` block, so creating a `.env.local` with an API key has no effect on the client build. There are two supported ways to provide a key:

### Server-Side Key (default): `GEMINI_API_KEY`

Google Gemini API key used by the serverless functions in `api/`.

**Format**: String
**Required**: Only for the server-key path
**Example**: `GEMINI_API_KEY=AIzaSyBw8vQ9X...`
**Read by**: `api/analyze.ts`, `api/compare.ts`, `api/key-status.ts` via `process.env` at request time — never at build time, never exposed to browsers

**Setup Instructions**:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create or sign in to your Google account
3. Generate a new API key for Gemini models
4. Set `GEMINI_API_KEY` in the deployment environment (e.g. the Vercel dashboard under Settings → Environment Variables)

For local development the functions only run under `vercel dev` (Vercel CLI + linked project) with `GEMINI_API_KEY` available in the environment. Plain `npm run dev` serves the front-end only.

**Security Notes**:
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly for security
- Monitor usage and set quota alerts

### Browser Key (bring your own key)

Users can paste their own Gemini API key into the in-app Settings menu (gear icon in the header).

- Stored in the browser's `localStorage` under the key `alcohol-label-analyzer-api-key`
- Used to call Gemini **directly from the browser**; it is never sent to this app's servers
- Takes precedence over the server-side path whenever present
- Removed via the "Remove" button in Settings

## Serverless Function Configuration

The `api/` directory contains Vercel serverless functions. They are auto-detected at deploy time — no `vercel.json` is needed.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/analyze` | POST | New-label compliance analysis |
| `/api/compare` | POST | Current-vs-proposed label comparison |
| `/api/key-status` | GET | Reports `{ configured: boolean }`; `?test=1` performs a live (tiny) Gemini call |

**Request size limit**: Vercel rejects request bodies over ~4.5 MB. The client refuses to send payloads above ~4.2 MB (`MAX_PROXY_PAYLOAD_BYTES` in `services/geminiService.ts`) and shows a friendly error suggesting fewer/smaller images or a browser key (which calls Gemini directly and bypasses the limit). Uploaded images are downscaled client-side to stay within it (see Image Upload Limits below).

**Abuse note**: the endpoints are unauthenticated. Prompts are built server-side (in `shared/labelAnalysis.ts`), so they are not a generic Gemini relay, but anyone who can reach the deployed site can run analyses on the configured key. Add authentication or rate limiting in front of `/api` for sensitive deployments.

## Build Configuration

### Vite Configuration

The application uses Vite for building and development. The full configuration in `vite.config.ts`:

```typescript
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
```

There are no `VITE_`-prefixed environment variables; the client build reads no environment at all. `index.html` is minimal — all CSS and JavaScript is bundled by Vite (no CDN scripts or import maps).

### TypeScript Configuration

Strict TypeScript configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "allowJs": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

### Tailwind CSS Configuration

The project uses Tailwind CSS v4, which is configured in CSS rather than JavaScript — there is **no `tailwind.config.js`** (v4 uses CSS-first configuration and automatic content detection). The entry point is `index.css`:

```css
@import "tailwindcss";

/* Dark mode is toggled via the `dark` class on <html> (see ThemeContext) */
@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --font-sans: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
}
```

`postcss.config.js` contains only the Tailwind plugin (autoprefixer is built into v4):

```javascript
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

To extend the theme, add design tokens to the `@theme` block in `index.css`.

## Application Settings

### Default Settings

```typescript
// constants.ts — the only application constant
export const APP_VERSION = "1.4.0";
```

The default beverage category is `'distilled-spirits'`, selectable in the UI for both analysis modes.

### Image Upload Limits

Defined in `services/imageProcessingService.ts` (per-image limit in `App.tsx`):

```typescript
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB original-file cap

const PASS_THROUGH_MAX_BYTES = 1.5 * 1024 * 1024;   // larger files are re-encoded
const MAX_DIMENSION = 2000;                          // longest side after downscaling
const JPEG_QUALITY = 0.9;

export const GEMINI_SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];
```

- Up to 5 images per analysis (`maxImages={5}`)
- Files over 1.5 MB (or in unsupported formats) are drawn to a canvas, downscaled to at most 2000px on the longest side, and re-encoded as JPEG so multi-image payloads stay within the serverless body limit
- HEIC/HEIF files pass through untouched (Gemini accepts them; browsers cannot re-encode them)

### Prompt Configuration

AI prompts and the Gemini calls live in `shared/labelAnalysis.ts`, which is isomorphic: it runs in the browser (browser key) and in the serverless functions (server key).

```typescript
export const GEMINI_MODEL = 'gemini-3.5-flash';

export const buildAnalysisPrompt = (req: AnalyzeRequest): string => { /* ... */ };
export const buildComparisonPrompt = (req: CompareRequest): string => { /* ... */ };
```

Both modes request structured JSON output via `responseMimeType: 'application/json'` and a `responseSchema`, so reports parse reliably. Request/response contracts are in `shared/analysisTypes.ts`.

## Security Configuration

### API Key Security

**Best Practices**:
- Server key: environment variable only, set in the hosting dashboard; it is read at request time and never shipped to browsers
- Browser key: stays in the user's `localStorage`; anyone with access to that browser profile can read it — remove it on shared machines
- Use different keys for different environments
- Rotate keys regularly and monitor quota

**Key Status Check** (`services/geminiService.ts`):

```typescript
export const getApiKeyStatus = async (): Promise<ApiKeyStatus> => {
  if (getLocalApiKey()) {
    return { isConfigured: true, source: 'local' };
  }
  if (await isServerKeyConfigured()) {  // GET /api/key-status
    return { isConfigured: true, source: 'server' };
  }
  return { isConfigured: false, source: 'none' };
};
```

This presence check runs when the Settings menu loads; it makes **no** Gemini call. The "Test Connection" button performs a live test (one tiny Gemini request) on explicit user action only. The status text distinguishes "Server key configured" from "Your key (untested)".

### Content Security Policy

Recommended CSP headers for production:

```
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' https://generativelanguage.googleapis.com;
  font-src 'self';
```

`connect-src` needs `'self'` for the `/api` routes and the Google endpoint for direct browser-key calls.

## Deployment Configuration

### Vercel

No `vercel.json` is required — the framework preset and the `api/` functions are detected automatically.

**Build Settings**:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

**Environment Variables**:
1. Go to Project Settings → Environment Variables
2. Add `GEMINI_API_KEY` (used only by the serverless functions at runtime; it does not need to exist at build time)
3. Redeploy to apply changes

### Other Platforms

`npm run build` produces a plain static SPA in `dist/` that any static host can serve (with an SPA fallback to `index.html`). However, the `api/` functions are Vercel-specific: on Netlify, AWS Amplify, Azure Static Web Apps, GitHub Pages, or a plain web server the server-key path is unavailable, and users must supply their own key via the Settings menu — or you must port the three small handlers in `api/` to the platform's function format. Setting `GEMINI_API_KEY` as a build-time variable on these platforms does nothing.

See the [Deployment Guide](./deployment.md) for details.

## Monitoring Configuration

### Analytics

Vercel Analytics is already wired up in `App.tsx`:

```typescript
import { Analytics } from '@vercel/analytics/react';

// Rendered at the root of the App component
<Analytics />
```

### Health Check

`GET /api/key-status` doubles as a lightweight health check for the serverless layer: it returns `{ "configured": true }` when the deployment has a key. Avoid automating `?test=1` — each call costs a real Gemini request.

## Development Configuration

### Development Server

- `npm run dev` — Vite dev server with HMR; serves the **front-end only**, so the `/api` routes are unavailable (use a browser key from Settings)
- `vercel dev` — serves the front-end and the serverless functions together; requires the Vercel CLI, a linked project, and `GEMINI_API_KEY` in the environment

**Debugging**:
```typescript
// Enable debug logging
if (import.meta.env.DEV) {
  console.log('Debug info:', debugData);
}
```

## Customization Options

### Theming

- Light/dark mode is class-based: `ThemeContext` toggles the `dark` class on `<html>`, matched by the `@custom-variant dark` rule in `index.css`
- Extend colors, fonts, and spacing through the `@theme` block in `index.css` (Tailwind v4 CSS-first configuration)
- Custom scrollbar, transition, and line-clamp styles also live in `index.css`

This configuration guide covers all configurable aspects of the Alcohol Label Compliance Analyzer application.

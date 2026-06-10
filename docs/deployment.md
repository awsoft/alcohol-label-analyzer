# Deployment Guide

## Overview

This guide covers deploying the Alcohol Label Compliance Analyzer to production environments.

The app has two parts:
- A static Vite/React front-end (built to `dist/`)
- Three Vercel serverless functions in `api/` (`analyze.ts`, `compare.ts`, `key-status.ts`) that hold the Gemini API key server-side

**Vercel is the recommended platform** because it deploys both parts together. Any other host can serve the static front-end, but without the functions the server-key path is unavailable and users must bring their own key via the in-app Settings menu.

## How the API Key Works in Production

The Gemini API key is **never** embedded in the client bundle — there is nothing to configure at build time, and inspecting the deployed JavaScript reveals no key.

1. **Server-side key (default)**: set `GEMINI_API_KEY` in the deployment environment. The browser posts images to `/api/analyze` and `/api/compare`, which read the key from `process.env` at request time.
2. **Bring your own key**: users paste a key into the Settings menu (gear icon); it is stored in browser `localStorage` and used to call Gemini directly, taking precedence over the server path.

## Pre-Deployment Checklist

### Environment Setup
- [ ] Google Gemini API key generated (for the server-key path)
- [ ] `GEMINI_API_KEY` set in the hosting platform's environment (runtime, not build)
- [ ] Production build tested locally (`npm run build && npm run preview`)
- [ ] All dependencies up to date (`npm audit` reports 0 vulnerabilities)
- [ ] TypeScript compilation successful (`npx tsc --noEmit`)

### Security Review
- [ ] No API keys in source code or in the built bundle
- [ ] HTTPS enabled for production
- [ ] Abuse exposure considered: the `/api` endpoints are unauthenticated (see below)
- [ ] Error handling prevents sensitive data exposure

### Performance
- [ ] Client-side image downscaling verified (uploads over 1.5 MB are re-encoded; payloads near the ~4.5 MB function limit are rejected with a friendly error)
- [ ] Cache headers configured for static assets

## Platform-Specific Deployment

### Vercel (Recommended)

Vercel deploys the Vite front-end and auto-detects the serverless functions in `api/` — **no `vercel.json` is needed**.

#### Quick Deploy

1. **Connect Repository**:
   - Visit [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your Git repository

2. **Configure Build Settings**:
   ```
   Framework Preset: Vite
   Build Command: npm run build
   Output Directory: dist
   Install Command: npm install
   ```

3. **Environment Variables**:
   ```
   GEMINI_API_KEY=your_production_gemini_api_key
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel builds the front-end and deploys the functions in `api/`

#### Environment Variables Setup

1. Go to Project Settings → Environment Variables
2. Add the production variable:
   ```
   Name: GEMINI_API_KEY
   Value: your_production_gemini_api_key
   Environments: Production, Preview
   ```
3. Redeploy to apply changes

The variable is read **only** by the serverless functions at request time. It does not need to be available at build time and is never exposed to browsers.

#### Request Size Limit

Vercel rejects function request bodies over ~4.5 MB. The client compensates automatically:
- Uploaded files are capped at 5 MB each and downscaled to at most 2000px on the longest side (large files are re-encoded as JPEG)
- Payloads still exceeding ~4.2 MB are blocked client-side with a friendly error suggesting fewer/smaller images — or a user-supplied key in Settings, which calls Gemini directly and bypasses the limit

#### Abuse Protection

The serverless endpoints constrain usage to label analysis (prompts are built server-side), but they are **unauthenticated** — anyone who can reach the deployed site can submit images for analysis on the configured key. If that matters for your deployment, add authentication or rate limiting in front of the `/api` routes (e.g. Vercel WAF rules, an auth proxy, or platform middleware), and set quota alerts on the Gemini key.

#### Custom Domain Setup

1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as shown
4. SSL certificates are automatically managed

### Static Hosts (Netlify, AWS Amplify, Azure Static Web Apps, GitHub Pages)

These platforms can serve the front-end, but the functions in `api/` use Vercel's handler format and **will not be deployed** — the server-key path returns "endpoints are not available" and every user must add their own Gemini key via the Settings menu. Do **not** set `GEMINI_API_KEY` as a build variable on these platforms; the build does not read it. To get the server-key path elsewhere, port the three small handlers in `api/` to the platform's function format (e.g. Netlify Functions).

Generic recipe:

1. **Build**: `npm install && npm run build`
2. **Publish**: the `dist/` directory
3. **SPA fallback**: rewrite all routes to `/index.html`

**Example `netlify.toml`**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**GitHub Pages note** — if the site is served from a subdirectory, set the base path:
```typescript
// vite.config.ts
export default defineConfig({
  base: '/repository-name/',
  // ... other config
});
```

## Custom Server Deployment

The same caveat applies: a self-hosted deployment serves only the static front-end, so users must bring their own key unless you also host the analysis endpoints yourself.

### Docker Deployment

**Dockerfile**:
```dockerfile
# Build stage
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

No build arguments or environment variables are needed — the build does not consume an API key.

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    root /var/www/html;
    index index.html;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
```

## Environment Management

`GEMINI_API_KEY` is the only environment variable, and it is a **runtime server variable** — there are no `.env.production`/`.env.staging` client files, no `VITE_`-prefixed variables, and no per-environment build scripts.

**Multiple environments on Vercel**:
- Use the dashboard's Production / Preview / Development environment scoping to assign different keys per environment
- Pull development values locally with `vercel env pull`
- Run the full stack locally with `vercel dev` (requires the Vercel CLI and a linked project)

**Local development without Vercel**: `npm run dev` serves the front-end only; add a key via the in-app Settings menu.

## Monitoring and Maintenance

### Health Checks

The deployment exposes a natural health check:

```
GET /api/key-status        → { "configured": true | false }
GET /api/key-status?test=1 → { "configured": true, "live": true | false }
```

The plain request is free and safe to poll. The `?test=1` variant performs a real (tiny) Gemini call — keep it user-initiated (it backs the "Test Connection" button in Settings) rather than automated.

### Analytics

Vercel Analytics is already integrated (`<Analytics />` in `App.tsx`) and activates automatically on Vercel deployments once Analytics is enabled for the project.

### Error Monitoring

Serverless function errors surface as JSON (`{ "error": "..." }`) with appropriate status codes (`400` bad request, `503` no key configured, `502` upstream Gemini failure) and appear in the Vercel function logs. Client-side errors are shown in the UI and logged to the browser console.

## Troubleshooting Deployment

### Common Issues

**Build Failures**:
```bash
# Check Node.js version (20.x or higher)
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit
```

**API Key / Function Issues**:
- Settings shows "Not configured": `GEMINI_API_KEY` is missing from the environment, or the change was not followed by a redeploy
- `503` from `/api/analyze` or `/api/compare`: the deployed functions found no `GEMINI_API_KEY`
- "The analysis endpoints are not available in this environment": the host did not deploy the `api/` functions (non-Vercel static host, or local `npm run dev`/`npm run preview`) — users must add their own key in Settings
- "The combined images are too large to send": payload exceeded the ~4 MB client guard — use fewer/smaller images or a browser key
- Verifying the key is absent from the bundle: `grep -r "AIza" dist/` should return nothing

**Routing Issues**:
- Ensure the SPA fallback to `/index.html` is configured (automatic on Vercel)
- On Vercel, paths under `/api/` must reach the functions, not the SPA fallback
- Verify the `base` path configuration when serving from a subdirectory

### Deployment Validation

**Post-Deployment Checklist**:
- [ ] Application loads without errors
- [ ] `GET /api/key-status` returns `{ "configured": true }`
- [ ] Settings menu shows "Server key configured" and "Test Connection" reports Connected
- [ ] Image upload works (including a file over 1.5 MB, which should be downscaled transparently)
- [ ] New-label analysis completes successfully
- [ ] Label comparison mode (with beverage category selection) completes successfully
- [ ] PDF export works
- [ ] Dark mode toggle works
- [ ] Analytics tracking functional

This deployment guide provides comprehensive coverage for deploying the Alcohol Label Compliance Analyzer to production environments.

# Deployment Guide

## Overview

This guide covers deploying the Alcohol Label Compliance Analyzer to various hosting platforms and production environments.

## Pre-Deployment Checklist

### Environment Setup
- [ ] Google Gemini API key configured
- [ ] Environment variables properly set
- [ ] Production build tested locally
- [ ] All dependencies up to date
- [ ] TypeScript compilation successful

### Security Review
- [ ] No API keys in source code
- [ ] Environment variables properly secured
- [ ] Content Security Policy configured
- [ ] HTTPS enabled for production
- [ ] Error handling prevents sensitive data exposure

### Performance Optimization
- [ ] Bundle size analyzed and optimized
- [ ] Images and assets compressed
- [ ] Cache headers configured
- [ ] Code splitting implemented where beneficial

## Platform-Specific Deployment

### Vercel (Recommended)

Vercel provides optimal deployment for Vite React applications with built-in optimizations.

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
   Node.js Version: 18.x
   ```

3. **Environment Variables**:
   ```
   API_KEY=your_production_gemini_api_key
   ```

4. **Deploy**:
   - Click "Deploy"
   - Vercel automatically builds and deploys

#### Advanced Configuration

**`vercel.json` Configuration**:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {},
  "env": {
    "API_KEY": "@api-key"
  },
  "build": {
    "env": {
      "API_KEY": "@api-key"
    }
  },
  "headers": [
    {
      "source": "/(.*).(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/((?!api/.*).*)",
      "destination": "/index.html"
    }
  ]
}
```

**Environment Variables Setup**:
1. Go to Project Settings → Environment Variables
2. Add production variables:
   ```
   Name: API_KEY
   Value: your_production_gemini_api_key
   Environments: Production, Preview
   ```

**Custom Domain Setup**:
1. Go to Project Settings → Domains
2. Add your domain
3. Configure DNS records as shown
4. SSL certificates are automatically managed

### Netlify

Netlify provides excellent static site hosting with continuous deployment.

#### Quick Deploy

1. **Connect Repository**:
   - Visit [Netlify Dashboard](https://app.netlify.com/)
   - Click "New site from Git"
   - Connect your repository

2. **Build Settings**:
   ```
   Build command: npm run build
   Publish directory: dist
   ```

3. **Environment Variables**:
   ```
   API_KEY=your_production_gemini_api_key
   ```

#### Advanced Configuration

**`netlify.toml` Configuration**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"
  NPM_VERSION = "9"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.png"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[context.production.environment]
  API_KEY = "your_production_api_key"

[context.branch-deploy.environment]
  API_KEY = "your_staging_api_key"
```

**Build Hooks**:
```bash
# Trigger builds via webhook
curl -X POST -d {} https://api.netlify.com/build_hooks/your_hook_id
```

### AWS Amplify

AWS Amplify provides comprehensive hosting with CI/CD integration.

#### Setup Steps

1. **Connect Repository**:
   - Open AWS Amplify Console
   - Choose "Host your web app"
   - Connect your Git repository

2. **Build Settings**:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```

3. **Environment Variables**:
   ```
   API_KEY: your_production_api_key
   ```

**Advanced Configuration**:

**Custom Headers**:
```json
[
  {
    "source": "/**",
    "headers": [
      {
        "key": "Strict-Transport-Security",
        "value": "max-age=31536000; includeSubDomains"
      },
      {
        "key": "X-Content-Type-Options",
        "value": "nosniff"
      }
    ]
  }
]
```

**Redirects and Rewrites**:
```json
[
  {
    "source": "/<*>",
    "target": "/index.html",
    "status": "200",
    "condition": null
  }
]
```

### Azure Static Web Apps

Microsoft Azure provides excellent static web app hosting.

#### Setup Process

1. **Create Static Web App**:
   - Open Azure Portal
   - Create new Static Web App
   - Connect GitHub repository

2. **GitHub Actions Configuration**:
   ```yaml
   name: Azure Static Web Apps CI/CD

   on:
     push:
       branches:
         - main
     pull_request:
       types: [opened, synchronize, reopened, closed]
       branches:
         - main

   jobs:
     build_and_deploy_job:
       if: github.event_name == 'push' || (github.event_name == 'pull_request' && github.event.action != 'closed')
       runs-on: ubuntu-latest
       name: Build and Deploy Job
       steps:
         - uses: actions/checkout@v3
           with:
             submodules: true
         - name: Build And Deploy
           id: builddeploy
           uses: Azure/static-web-apps-deploy@v1
           with:
             azure_static_web_apps_api_token: ${{ secrets.AZURE_STATIC_WEB_APPS_API_TOKEN }}
             repo_token: ${{ secrets.GITHUB_TOKEN }}
             action: "upload"
             app_location: "/"
             api_location: ""
             output_location: "dist"
           env:
             API_KEY: ${{ secrets.API_KEY }}
   ```

3. **Configuration File** (`staticwebapp.config.json`):
   ```json
   {
     "routes": [
       {
         "route": "/*",
         "serve": "/index.html",
         "statusCode": 200
       }
     ],
     "navigationFallback": {
       "rewrite": "/index.html"
     },
     "globalHeaders": {
       "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://generativelanguage.googleapis.com;"
     }
   }
   ```

### GitHub Pages

For simple static hosting directly from GitHub repository.

#### Setup Steps

1. **Enable GitHub Pages**:
   - Go to repository Settings → Pages
   - Select source: GitHub Actions

2. **GitHub Actions Workflow** (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: ['main']
     workflow_dispatch:

   permissions:
     contents: read
     pages: write
     id-token: write

   concurrency:
     group: 'pages'
     cancel-in-progress: false

   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v3
         - name: Setup Node
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
         - name: Install dependencies
           run: npm ci
         - name: Build
           run: npm run build
           env:
             API_KEY: ${{ secrets.API_KEY }}
         - name: Setup Pages
           uses: actions/configure-pages@v3
         - name: Upload artifact
           uses: actions/upload-pages-artifact@v2
           with:
             path: './dist'

     deploy:
       environment:
         name: github-pages
         url: ${{ steps.deployment.outputs.page_url }}
       runs-on: ubuntu-latest
       needs: build
       steps:
         - name: Deploy to GitHub Pages
           id: deployment
           uses: actions/deploy-pages@v2
   ```

3. **Base Path Configuration** (if using subdirectory):
   ```typescript
   // vite.config.ts
   export default defineConfig({
     base: '/repository-name/',
     // ... other config
   });
   ```

## Custom Server Deployment

### Docker Deployment

**Dockerfile**:
```dockerfile
# Build stage
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**:
```nginx
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
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
        add_header X-XSS-Protection "1; mode=block";
    }
}
```

**Docker Compose**:
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "80:80"
    environment:
      - API_KEY=${API_KEY}
    restart: unless-stopped
```

### Traditional Web Server

**Apache Configuration** (`.htaccess`):
```apache
RewriteEngine On
RewriteBase /

# Handle client-side routing
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]

# Cache static assets
<filesMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2)$">
    ExpiresActive on
    ExpiresDefault "access plus 1 year"
    Header set Cache-Control "public, immutable"
</filesMatch>

# Security headers
Header always set X-Frame-Options "SAMEORIGIN"
Header always set X-Content-Type-Options "nosniff"
Header always set X-XSS-Protection "1; mode=block"
```

**Nginx Configuration**:
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

    # Gzip compression
    gzip on;
    gzip_types
        text/plain
        text/css
        text/js
        text/xml
        text/javascript
        application/javascript
        application/xml+rss;
}
```

## Environment Management

### Multiple Environments

**Development**:
```bash
# .env.development
API_KEY=dev_gemini_api_key
VITE_DEBUG_MODE=true
VITE_ANALYTICS_ENABLED=false
```

**Staging**:
```bash
# .env.staging
API_KEY=staging_gemini_api_key
VITE_DEBUG_MODE=false
VITE_ANALYTICS_ENABLED=true
```

**Production**:
```bash
# .env.production
API_KEY=production_gemini_api_key
VITE_DEBUG_MODE=false
VITE_ANALYTICS_ENABLED=true
```

### CI/CD Environment Variables

**GitHub Secrets**:
```bash
API_KEY_DEV=development_api_key
API_KEY_STAGING=staging_api_key
API_KEY_PROD=production_api_key
```

**Build Scripts**:
```json
{
  "scripts": {
    "build:dev": "vite build --mode development",
    "build:staging": "vite build --mode staging",
    "build:prod": "vite build --mode production"
  }
}
```

## Monitoring and Maintenance

### Health Checks

**Basic Health Check**:
```typescript
// Add to main app
const healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  version: APP_VERSION,
  apiStatus: getApiKeyStatus().isConfigured ? 'configured' : 'not-configured'
};

// Expose as JSON endpoint if using server
```

### Error Monitoring

**Error Boundary**:
```typescript
// Production error logging
componentDidCatch(error: Error, errorInfo: ErrorInfo) {
  if (import.meta.env.PROD) {
    // Send to monitoring service
    console.error('Production error:', error, errorInfo);
  }
}
```

### Performance Monitoring

**Web Vitals**:
```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  // Send to analytics service
  console.log(metric);
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

## Troubleshooting Deployment

### Common Issues

**Build Failures**:
```bash
# Check Node.js version
node --version

# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check TypeScript
npx tsc --noEmit
```

**Environment Variable Issues**:
```bash
# Verify environment variables are set
echo $API_KEY

# Check build output includes variables
npm run build && cat dist/index.html
```

**Routing Issues**:
- Ensure SPA fallback is configured
- Check server configuration for client-side routing
- Verify base path configuration

**Performance Issues**:
```bash
# Analyze bundle size
npm run build -- --analyze

# Check for large dependencies
npx webpack-bundle-analyzer dist
```

### Deployment Validation

**Post-Deployment Checklist**:
- [ ] Application loads without errors
- [ ] API key functionality works
- [ ] Image upload works correctly
- [ ] Analysis completes successfully
- [ ] PDF generation works
- [ ] All routes accessible
- [ ] Performance within acceptable limits
- [ ] Error handling works correctly
- [ ] Analytics tracking functional

This deployment guide provides comprehensive coverage for deploying the Alcohol Label Compliance Analyzer to production environments.
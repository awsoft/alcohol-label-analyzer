# Configuration Guide

## Environment Variables

### Required Configuration

#### `API_KEY`

Google Gemini API key for AI-powered label analysis.

**Format**: String
**Required**: Yes
**Example**: `API_KEY=AIzaSyBw8vQ9X...`

**Setup Instructions**:
1. Visit [Google AI Studio](https://aistudio.google.com/)
2. Create or sign in to your Google account
3. Generate a new API key for Gemini models
4. Add the key to your `.env.local` file

**Security Notes**:
- Never commit API keys to version control
- Use different keys for development and production
- Rotate keys regularly for security
- Monitor usage and set quota alerts

### Optional Configuration

#### `VITE_APP_VERSION`

Override the application version displayed in the UI.

**Format**: String (semantic version)
**Required**: No
**Default**: Value from `package.json`
**Example**: `VITE_APP_VERSION=1.2.0`

## Environment Files

### Development Environment

Create a `.env.local` file in the project root:

```bash
# Required: Google Gemini API Key
API_KEY=your_gemini_api_key_here

# Optional: Version override
VITE_APP_VERSION=1.2.0

# Optional: Debug settings
VITE_DEBUG_MODE=true
```

### Production Environment

For production deployments, set environment variables through your hosting platform:

**Vercel**:
1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add `API_KEY` with your production API key
4. Deploy to apply changes

**Other Platforms**:
- Netlify: Site settings → Environment variables
- AWS Amplify: App settings → Environment variables
- Azure Static Web Apps: Configuration → Application settings

### Environment Variable Loading

Vite loads environment variables in this order:
1. `.env.local` (always ignored by git)
2. `.env.production` or `.env.development`
3. `.env`

Variables prefixed with `VITE_` are exposed to client-side code.

## Build Configuration

### Vite Configuration

The application uses Vite for building and development. Configuration is in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  
  // Build settings
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          gemini: ['@google/genai'],
          pdf: ['jspdf', 'jspdf-autotable']
        }
      }
    }
  },
  
  // Development server
  server: {
    port: 5173,
    host: true,
    open: true
  },
  
  // Preview server (for production builds)
  preview: {
    port: 4173,
    host: true
  }
});
```

### TypeScript Configuration

Strict TypeScript configuration in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedSideEffectImports": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### Tailwind CSS Configuration

Styling configuration would be in `tailwind.config.js` (if present):

```javascript
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Custom color extensions
      }
    },
  },
  plugins: [],
}
```

## Application Settings

### Default Settings

```typescript
// Application version
export const APP_VERSION = "1.2.0";

// Default beverage category
const DEFAULT_BEVERAGE_CATEGORY = 'distilled-spirits';

// Image upload limits
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMAGES_COUNT = 5;

// Supported MIME types
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp'
];
```

### Prompt Configuration

AI analysis prompts are configurable in `constants.ts`:

```typescript
// Base prompt for all categories
const BASE_PROMPT = `
You are an expert in U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB) 
alcohol beverage labeling regulations...
`;

// Category-specific prompts
const DISTILLED_SPIRITS_REQUIREMENTS = `...`;
const WINE_REQUIREMENTS = `...`;
const MALT_BEVERAGES_REQUIREMENTS = `...`;

// Dynamic prompt generation
export const getCategorySpecificPrompt = (category: BeverageCategory): string => {
  // Implementation
};
```

## Performance Configuration

### Bundle Optimization

**Code Splitting**:
```typescript
// Manual chunks in vite.config.ts
manualChunks: {
  vendor: ['react', 'react-dom'],
  gemini: ['@google/genai'],
  pdf: ['jspdf', 'jspdf-autotable'],
  icons: ['lucide-react']
}
```

**Tree Shaking**:
- ES modules for optimal tree shaking
- Selective imports where possible
- Dead code elimination in production builds

### Runtime Performance

**Image Processing**:
- Client-side compression
- Base64 encoding limits
- Memory cleanup for object URLs

**API Optimization**:
- Single request for multiple images
- Request batching where applicable
- Error retry mechanisms

## Security Configuration

### API Key Security

**Best Practices**:
- Use environment variables only
- Different keys for different environments
- Regular key rotation
- Quota monitoring and alerts

**Key Validation**:
```typescript
export const getApiKeyStatus = (): { isConfigured: boolean; status: string } => {
  if (!API_KEY || API_KEY === "MISSING_API_KEY") {
    return {
      isConfigured: false,
      status: "API Key not configured"
    };
  }
  return {
    isConfigured: true,
    status: "Gemini API configured"
  };
};
```

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

## Deployment Configuration

### Vercel

**`vercel.json` configuration**:
```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "env": {
    "API_KEY": "@api-key"
  }
}
```

**Build Settings**:
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: 18.x

### Netlify

**`netlify.toml` configuration**:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Static Hosting

For generic static hosting:

**Build Process**:
1. `npm install`
2. `npm run build`
3. Upload `dist/` folder contents
4. Configure environment variables through hosting platform

**Server Configuration**:
- Serve `index.html` for all routes (SPA)
- Enable gzip compression
- Set appropriate cache headers

## Monitoring Configuration

### Analytics

**Vercel Analytics**:
```typescript
import { Analytics } from '@vercel/analytics/react';

// Add to App component
<Analytics />
```

**Custom Tracking**:
```typescript
// Track custom events
import { track } from '@vercel/analytics';

track('analysis_completed', {
  category: beverageCategory,
  imageCount: images.length
});
```

### Error Tracking

**Error Boundaries**:
```typescript
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to monitoring service
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }
    return this.props.children;
  }
}
```

## Development Configuration

### Development Server

**Hot Module Replacement**:
- Enabled by default with Vite
- Preserves component state during updates
- Fast refresh for React components

**Debugging**:
```typescript
// Enable debug logging
if (import.meta.env.DEV) {
  console.log('Debug info:', debugData);
}
```

### Testing Configuration

**Jest Configuration** (if added):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapping: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
```

## Customization Options

### Theming

**Color Scheme**:
- Light/dark mode support via Tailwind CSS
- Custom color palette in theme configuration
- System preference detection

**Layout**:
- Responsive breakpoints
- Component spacing
- Typography scale

### Feature Flags

**Optional Features**:
```typescript
const FEATURE_FLAGS = {
  enablePDFExport: true,
  enableMultipleImages: true,
  enableDarkMode: true,
  enableAnalytics: true
};
```

### Localization

**Future Support**:
- i18n framework integration
- Multiple language support
- Regional compliance variations

This configuration guide provides comprehensive coverage of all configurable aspects of the Alcohol Label Compliance Analyzer application.
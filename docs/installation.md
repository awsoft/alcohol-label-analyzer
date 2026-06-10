# Installation Guide

## Prerequisites

Before installing the Alcohol Label Compliance Analyzer, ensure you have the following prerequisites:

### System Requirements
- **Node.js**: Version 20.x or higher (required by the `@google/genai` SDK)
- **npm**: Version 9.x or higher (comes with Node.js)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+ recommended)
- **Browser**: Modern browser with JavaScript enabled (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### API Requirements
- **Google Gemini API Key**: Required for AI-powered label analysis
  - Sign up at [Google AI Studio](https://aistudio.google.com/)
  - Generate an API key for Gemini models
  - Ensure you have sufficient quota for image analysis

The key is **not** baked into the build. You provide it at runtime in one of two ways (see step 3): paste it into the in-app Settings menu, or set `GEMINI_API_KEY` in the server environment for the serverless functions.

## Installation Steps

### 1. Clone or Download the Repository

If you have access to the source code repository:
```bash
git clone <repository-url>
cd alcohol-label-analyzer
```

### 2. Install Dependencies

Install all required npm packages:
```bash
npm install
```

This will install the following key dependencies:
- React 19 and React DOM
- TypeScript and type definitions
- Vite 6 build tool
- Tailwind CSS v4 (with the `@tailwindcss/postcss` plugin)
- Google Gen AI SDK (`@google/genai`)
- jsPDF for report generation
- Lucide React for icons
- Vercel Analytics

### 3. Provide a Gemini API Key

There is no `.env.local` step for local development — `npm run dev` serves only the front-end, and the Vite build never reads or embeds an API key. Choose one of these options:

**Option A — In-app key (simplest):**
1. Start the dev server (step 4)
2. Click the Settings gear icon in the header
3. Click "Add API Key" and paste your Gemini key

The key is stored in your browser's `localStorage` and used to call Gemini directly from the browser.

**Option B — Run the serverless functions locally:**

The `/api` routes (which hold the key server-side) only run under Vercel's dev server:
```bash
npm install -g vercel
vercel link          # link the directory to a Vercel project
vercel dev           # serves the front-end and the /api functions together
```
`GEMINI_API_KEY` must be available in the environment — export it in your shell, or add it to the linked project's Development environment and pull it with `vercel env pull`.

**Important Security Notes:**
- Never commit API keys to version control
- Keep your API key secure and rotate it regularly
- Use environment-specific API keys for development vs. production

### 4. Verify Installation

Start the development server to verify everything is working:
```bash
npm run dev
```

The application should be available at `http://localhost:5173`. You should see:
- The main interface loads without errors
- The Settings menu (gear icon) opens and shows the API key status
- You can access the image upload area
- After adding a key in Settings, the "Test Connection" button reports "Connected"

Note: under plain `npm run dev` the `/api` routes are unavailable, so the status reads "Not configured" until you add your own key via Settings (or switch to `vercel dev`).

### 5. Build for Production (Optional)

To create a production build:
```bash
npm run build
```

This creates a `dist/` folder with optimized static files ready for deployment. No API key is needed at build time, and none ends up in the bundle.

## Configuration Options

### Environment Variables

| Variable | Required | Description | Where it is read |
|----------|----------|-------------|------------------|
| `GEMINI_API_KEY` | Only for the server-key path | Google Gemini API key used by the serverless functions in `api/` | Server runtime only (`process.env`) — never the client build |

The client build uses no environment variables (there are no `VITE_`-prefixed variables). The app version shown in the UI comes from `APP_VERSION` in `constants.ts`.

### Build Configuration

The application uses Vite for building. Configuration is in `vite.config.ts`:

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

## Development Environment Setup

### 1. IDE Setup

**Recommended IDEs:**
- Visual Studio Code with extensions:
  - ES7+ React/Redux/React-Native snippets
  - TypeScript Hero
  - Prettier
  - ESLint
  - Tailwind CSS IntelliSense

### 2. TypeScript Configuration

The project uses TypeScript with strict type checking. Configuration is in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "paths": { "@/*": ["./*"] }
  }
}
```

### 3. Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `dev` | Start development server (front-end only) | `npm run dev` |
| `build` | Create production build | `npm run build` |
| `preview` | Preview production build | `npm run preview` |
| `install-types` | Install React type definitions | `npm run install-types` |

## Troubleshooting Installation

### Common Issues

**1. Node.js Version Compatibility**
```bash
# Check Node.js version (20.x or higher required)
node --version

# If outdated, install the latest LTS version
# Visit https://nodejs.org/
```

**2. npm Install Failures**
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**3. API Key Issues**
- "The analysis endpoints are not available in this environment": you are running plain `npm run dev` (or `npm run preview`), which has no `/api` routes — add your own key via the Settings menu, or run `vercel dev`
- "The configured Gemini API key is invalid": verify the key in Google AI Studio
- Quota errors: check usage and limits on your Google account
- Under `vercel dev`, make sure `GEMINI_API_KEY` is set in the environment and restart the server after changing it

**4. Port Conflicts**
If port 5173 is in use:
```bash
# Start on different port
npm run dev -- --port 3000
```

**5. TypeScript Errors**
```bash
# Install missing type definitions
npm run install-types

# Check TypeScript configuration
npx tsc --noEmit
```

### Getting Help

If you encounter issues not covered here:
1. Check the [Troubleshooting Guide](./troubleshooting.md)
2. Review the browser console for error messages
3. Verify all prerequisites are met
4. Check the API key status in the Settings menu

## Next Steps

After successful installation:
1. Read the [User Guide](./user-guide.md) to learn how to use the application
2. Review the [Configuration Guide](./configuration.md) for advanced settings
3. Check the [Architecture Overview](./architecture.md) if you plan to modify the code

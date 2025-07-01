# Installation Guide

## Prerequisites

Before installing the Alcohol Label Compliance Analyzer, ensure you have the following prerequisites:

### System Requirements
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (comes with Node.js)
- **Operating System**: Windows 10+, macOS 10.15+, or Linux (Ubuntu 20.04+ recommended)
- **Browser**: Modern browser with JavaScript enabled (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

### API Requirements
- **Google Gemini API Key**: Required for AI-powered label analysis
  - Sign up at [Google AI Studio](https://aistudio.google.com/)
  - Generate an API key for Gemini models
  - Ensure you have sufficient quota for image analysis

## Installation Steps

### 1. Clone or Download the Repository

If you have access to the source code repository:
```bash
git clone <repository-url>
cd alcohol-label-compliance-analyzer
```

### 2. Install Dependencies

Install all required npm packages:
```bash
npm install
```

This will install the following key dependencies:
- React 19 and React DOM
- TypeScript and type definitions
- Vite build tool
- Google Generative AI SDK
- jsPDF for report generation
- Lucide React for icons
- Vercel Analytics

### 3. Environment Configuration

Create a `.env.local` file in the root directory of the project:

```bash
# Required: Google Gemini API Key
API_KEY=your_gemini_api_key_here

# Optional: Additional configuration
VITE_APP_VERSION=1.2.0
```

**Important Security Notes:**
- Never commit your `.env.local` file to version control
- Keep your API key secure and rotate it regularly
- Use environment-specific API keys for development vs. production

### 4. Verify Installation

Start the development server to verify everything is working:
```bash
npm run dev
```

The application should be available at `http://localhost:5173`. You should see:
- The main interface loads without errors
- The header shows "Ready" status
- You can access the image upload area
- No API key errors appear (if properly configured)

### 5. Build for Production (Optional)

To create a production build:
```bash
npm run build
```

This creates a `dist/` folder with optimized static files ready for deployment.

## Configuration Options

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `API_KEY` | Yes | Google Gemini API key for AI analysis | None |
| `VITE_APP_VERSION` | No | Application version displayed in UI | From package.json |

### Build Configuration

The application uses Vite for building. Configuration is in `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  // Build configuration
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: 'terser'
  },
  // Development server configuration
  server: {
    port: 5173,
    host: true
  }
})
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
  "include": ["src"]
}
```

### 3. Available Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `dev` | Start development server | `npm run dev` |
| `build` | Create production build | `npm run build` |
| `preview` | Preview production build | `npm run preview` |
| `install-types` | Install React type definitions | `npm run install-types` |

## Troubleshooting Installation

### Common Issues

**1. Node.js Version Compatibility**
```bash
# Check Node.js version
node --version

# If outdated, install latest LTS version
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
- Verify your Gemini API key is valid
- Check that the key has sufficient quota
- Ensure the `.env.local` file is in the root directory
- Restart the development server after adding environment variables

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
4. Check that environment variables are properly set

## Next Steps

After successful installation:
1. Read the [User Guide](./user-guide.md) to learn how to use the application
2. Review the [Configuration Guide](./configuration.md) for advanced settings
3. Check the [Architecture Overview](./architecture.md) if you plan to modify the code
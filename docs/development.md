# Development Guide

## Getting Started

This guide is for developers who want to contribute to or modify the Alcohol Label Compliance Analyzer application.

## Development Environment Setup

### Prerequisites

**Required Software**:
- Node.js 18.x or higher
- npm 9.x or higher
- Git for version control
- Modern code editor (VS Code recommended)
- Optional: Vercel CLI (`npm i -g vercel`) to run the serverless `/api` functions locally

**Recommended VS Code Extensions**:
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- Tailwind CSS IntelliSense
- Auto Rename Tag

### Initial Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd alcohol-label-analyzer
```

2. **Install dependencies**:
```bash
npm install
```

3. **Start development server**:
```bash
npm run dev
```

### Providing a Gemini API Key in Development

The Gemini API key is deliberately **not** bundled into the client: `vite.config.ts` has no `define` block and client code never reads `process.env`, so a `.env.local` file has no effect on the front-end build. `npm run dev` serves only the front-end — the `/api` serverless routes are not available, and server-path analysis fails with "The analysis endpoints are not available in this environment."

Choose one of:

- **Bring your own key (simplest)**: start `npm run dev`, open the app, and add a Gemini API key via the Settings menu (gear icon). The key is stored in `localStorage` under `alcohol-label-analyzer-api-key`, and the browser calls Gemini directly, skipping `/api` entirely.
- **Full stack with `vercel dev`**: run `vercel dev` (requires the Vercel CLI and a linked project) with `GEMINI_API_KEY` set in the environment. This serves the front-end and the `api/` functions together, matching production behavior.

## Project Structure Deep Dive

```
components/                       # React components
├── Header.tsx                   # Logo, theme toggle, settings dropdown
├── Footer.tsx                   # App footer
├── MultiImageUploader.tsx       # Multi-image upload (New Label mode)
├── BeverageCategorySelector.tsx # Category selection (both modes)
├── AnalysisDisplay.tsx          # Structured analysis report display
├── LabelComparison.tsx          # Label Change mode (uploads + compare)
├── ComparisonResults.tsx        # Structured comparison report display
├── LoadingSpinner.tsx           # Loading indicator
└── SettingsDropdown.tsx         # API key management and status

services/                         # Browser-side services
├── geminiService.ts             # Client entry points; picks BYO-key vs /api path
├── imageProcessingService.ts    # prepareImageForAnalysis (validate/downscale)
└── pdfService.ts                # PDF report generation (jsPDF)

shared/                           # Isomorphic code (browser AND serverless)
├── analysisTypes.ts             # Request/report contracts, compliance scoring
└── labelAnalysis.ts             # Prompts, response schemas, Gemini runners

api/                              # Vercel serverless functions
├── _types.ts                    # Minimal handler types (not deployed)
├── analyze.ts                   # POST /api/analyze
├── compare.ts                   # POST /api/compare
└── key-status.ts                # GET /api/key-status (?test=1 = live check)

contexts/
└── ThemeContext.tsx             # Single theme source ('dark' class on <html>)

types.ts                          # UI types: LabelType, LabelImage, categories
constants.ts                      # APP_VERSION only
App.tsx                           # Main application component + mode switch
index.tsx                         # React app entry point
index.html                        # HTML template (no CDN scripts)
index.css                         # Tailwind v4 entry (@import "tailwindcss")

docs/                             # Documentation
public/                           # Static assets (logos, favicon)

Configuration files:
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
├── vite.config.ts               # Vite config (no env injection)
└── postcss.config.js            # '@tailwindcss/postcss' only
```

**Structure notes**:
- Tailwind CSS v4 is configured entirely in `index.css` (`@import "tailwindcss"`, a `@custom-variant` for class-based dark mode, and a small `@theme` block). There is no `tailwind.config.js`.
- Anything imported by both the browser and the `api/` functions must live in `shared/` and stay free of browser-only and Node-only APIs.

## Development Workflow

### Branch Strategy

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: add new feature description"

# Push and create pull request
git push origin feature/your-feature-name
```

### Code Style

**TypeScript Standards**:
- Strict mode enabled
- Explicit type annotations for public APIs
- Use interfaces over types where possible
- Prefer const assertions for immutable data

**React Patterns**:
- Functional components with hooks
- TypeScript interfaces for all props
- Custom hooks for reusable logic
- Proper cleanup in useEffect

**Naming Conventions**:
- Components: PascalCase (e.g., `MultiImageUploader`)
- Files: PascalCase for components, camelCase for utilities
- Functions: camelCase
- Constants: UPPER_SNAKE_CASE
- Types/Interfaces: PascalCase

### Code Quality Tools

**TypeScript Checking** (the only automated check currently configured):
```bash
# Type checking without build
npx tsc --noEmit
```

No ESLint, Prettier, or test runner is set up — `package.json` defines only `dev`, `build`, `preview`, and `install-types` scripts. If you add tooling, wire it into `package.json` scripts and document it here.

## Adding New Features

### Creating New Components

1. **Component Template**:
```typescript
import React from 'react';

interface ComponentNameProps {
  // Define props interface
  prop1: string;
  prop2?: number;
  onAction?: () => void;
}

export const ComponentName: React.FC<ComponentNameProps> = ({
  prop1,
  prop2 = defaultValue,
  onAction
}) => {
  // Component implementation
  return (
    <div className="component-styles">
      {/* JSX content */}
    </div>
  );
};
```

2. **Adding to Main App**:
```typescript
// Import in App.tsx
import { ComponentName } from './components/ComponentName';

// Use in JSX
<ComponentName
  prop1="value"
  onAction={handleAction}
/>
```

### Extending Types

Types live in two places:
- **`types.ts`** — UI-side types: `LabelType`, `LabelImage`, `LABEL_TYPES`, `ProductRequirements`, `BeverageCategory`, `BEVERAGE_CATEGORIES`.
- **`shared/analysisTypes.ts`** — request/report contracts used by both the browser and the serverless functions: `AnalyzeRequest`, `CompareRequest`, `AnalysisReport`, `ComparisonReport`, `ItemComplianceStatus`, and the `calculateComplianceScore` helper.

Changing a contract in `shared/analysisTypes.ts` updates the client and the `api/` handlers together; if a report shape changes, also update the corresponding Gemini response schema in `shared/labelAnalysis.ts`.

### Adding New Beverage Categories

1. **Update Types** (`types.ts`):
```typescript
export type BeverageCategory = 
  | 'distilled-spirits' 
  | 'wine' 
  | 'malt-beverages'
  | 'new-category';

// Add to category info array
export const BEVERAGE_CATEGORIES: BeverageCategoryInfo[] = [
  // ... existing categories
  {
    id: 'new-category',
    name: 'New Category',
    description: 'Description of new category',
    examples: ['Example 1', 'Example 2']
  }
];
```

2. **Add the category's mandatory items** (`shared/labelAnalysis.ts`):
```typescript
const CATEGORY_ITEMS: Record<BeverageCategory, string> = {
  // ... existing categories
  'new-category': `
8. "New Category Requirement" — What to check and when it applies.`,
};
```

`buildAnalysisPrompt` appends `CATEGORY_ITEMS[req.beverageCategory]` to the base mandatory items, so no other prompt changes are needed. The comparison prompt is category-agnostic apart from naming the category.

### Extending the Analysis Services

Analysis logic is layered so the same code serves both key paths:

1. **`shared/labelAnalysis.ts`** — prompt builders, Gemini `responseSchema` definitions, and the runners `runLabelAnalysis`, `runLabelComparison`, and `testGeminiConnection`. The model is pinned via `GEMINI_MODEL = 'gemini-2.5-flash'`. Because Gemini is called with `responseMimeType: 'application/json'` and a schema, reports come back as structured JSON — no markdown parsing.
2. **`api/*.ts`** — thin Vercel handlers that validate the request, read `GEMINI_API_KEY` from the server environment, and call the shared runner.
3. **`services/geminiService.ts`** — browser entry points: `analyzeLabels`, `compareLabels`, `getApiKeyStatus` (async), `testApiConnection`, and `getLocalApiKey`. Each analysis call uses a locally saved key directly when present, otherwise POSTs to the corresponding `/api` route — rejecting payloads over ~4.2 MB client-side to stay under Vercel's ~4.5 MB body limit.

To add a new AI-backed operation, follow the same pattern: put the prompt/schema/runner in `shared/`, add an `api/` handler, then expose a client function in `services/geminiService.ts` that branches on `getLocalApiKey()`.

**Error Handling Patterns**:

Raw Gemini/SDK errors are translated to user-presentable messages in one place — `translateGeminiError` in `shared/labelAnalysis.ts`:
```typescript
if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
  return new Error('The configured Gemini API key is invalid. Please verify the key.');
}
if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
  return new Error('The Gemini API quota has been exceeded. Please check usage and limits.');
}
```

Serverless handlers return these messages as `{ error: string }` JSON with an appropriate status code (400 invalid request, 405 wrong method, 503 no server key, 502 upstream failure), and `services/geminiService.ts` surfaces them to the UI.

## Testing

There is no automated test suite configured (no test runner is installed and `package.json` has no `test` script). Until one is added, verify changes manually:

**Manual verification checklist**:
- `npx tsc --noEmit` passes
- `npm run build` succeeds
- New Label mode: upload 1–5 images, set requirements and category, run an analysis, expand report items, download the PDF
- Label Change mode: upload current + proposed images, pick a category, run a comparison — including two identical images (should show "No Differences Detected")
- Both key paths: with a key saved in Settings (direct Gemini calls) and without one against `vercel dev` with `GEMINI_API_KEY` set (server path)
- Error paths: files over 5 MB, server-path payloads over ~4 MB, and `npm run dev` without a key ("endpoints not available" message)

If you introduce a test framework (e.g. Vitest), colocate tests next to the code (`shared/labelAnalysis.test.ts`) and add `test` scripts to `package.json`.

## Debugging

### Development Tools

**React DevTools**:
- Install browser extension
- Inspect component hierarchy
- Monitor state changes
- Profile performance

**TypeScript Debugging**:
```typescript
// Add debugging logs
if (import.meta.env.DEV) {
  console.log('Debug info:', { state, props, result });
}
```

**Network Debugging**:
- Server path: watch `POST /api/analyze`, `POST /api/compare`, and `GET /api/key-status` in the browser Network tab; errors come back as `{ error: string }` JSON
- Bring-your-own-key path: requests go directly to `generativelanguage.googleapis.com`

### Common Issues

**Build Errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

**TypeScript Errors**:
```bash
# Check types without building
npx tsc --noEmit

# Update React type definitions
npm run install-types
```

**Import/Export Issues**:
```typescript
// Explicit imports
import { specific, functions } from './module';

// Avoid default export issues
export const namedExport = value;
```

## Performance Optimization

### Bundle Analysis

```bash
# Analyze bundle size
npm run build
npx vite-bundle-analyzer dist
```

### Code Splitting

```typescript
// Lazy loading components
const LazyComponent = React.lazy(() => import('./LazyComponent'));

// Use with Suspense
<Suspense fallback={<LoadingSpinner />}>
  <LazyComponent />
</Suspense>
```

### Image Payload Size

Uploaded images are the dominant cost. `prepareImageForAnalysis` already enforces a 5 MB per-file cap and downscales/re-encodes anything large (longest side 2000 px, JPEG) — keep that behavior intact when touching `services/imageProcessingService.ts`, since the server path rejects request bodies over ~4.2 MB.

## Deployment

### Build Process

```bash
# Production build
npm run build

# Preview build locally
npm run preview
```

Note: like `npm run dev`, `vite preview` serves only static files — the `/api` functions still require `vercel dev` or a real Vercel deployment. Production deployments need `GEMINI_API_KEY` set in the hosting environment for the server key path to work.

### Continuous Integration

**GitHub Actions Example**:
```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run build
```

## Contributing Guidelines

### Pull Request Process

1. **Fork and Clone**:
```bash
git clone https://github.com/your-username/repo-name.git
cd repo-name
```

2. **Create Feature Branch**:
```bash
git checkout -b feature/descriptive-name
```

3. **Make Changes**:
- Follow code style guidelines
- Update documentation
- Ensure TypeScript compliance

4. **Commit Changes**:
```bash
git add .
git commit -m "feat: add descriptive commit message"
```

5. **Submit Pull Request**:
- Clear description of changes
- Reference related issues
- Include testing steps
- Update documentation

### Code Review Checklist

**Functionality**:
- [ ] Feature works as intended
- [ ] Edge cases handled
- [ ] Error scenarios covered
- [ ] Performance considerations

**Code Quality**:
- [ ] TypeScript types correct
- [ ] Components properly structured
- [ ] Consistent naming conventions
- [ ] Proper error handling
- [ ] Shared code kept isomorphic (no browser/Node-only APIs in `shared/`)

**Testing**:
- [ ] `npx tsc --noEmit` and `npm run build` pass
- [ ] Manual testing completed (both analysis modes)
- [ ] Both key paths exercised where relevant (Settings key and server key)
- [ ] No regression issues

**Documentation**:
- [ ] Code comments added
- [ ] API documentation updated
- [ ] User guide updated if needed
- [ ] README changes if applicable

This development guide provides comprehensive information for contributing to and extending the Alcohol Label Compliance Analyzer application.

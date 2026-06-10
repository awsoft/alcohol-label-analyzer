# Architecture Overview

## System Architecture

The Alcohol Label Compliance Analyzer is built as a modern single-page application (SPA) using React with TypeScript, backed by a small set of Vercel serverless functions. The architecture follows a component-based design with clear separation of concerns, and all Gemini-facing logic lives in isomorphic modules shared by the browser and the server.

## High-Level Architecture

```
┌─────────────────────────────────────────────┐
│             Frontend (React SPA)             │
│  Components │ Services │ Types │ Contexts    │
└──────┬──────────────────────────────┬───────┘
       │ default (server key)         │ BYOK (user key in
       ▼                              │ localStorage)
┌─────────────────────────┐           │
│ Vercel functions (/api) │           │
│ read GEMINI_API_KEY     │           │
└──────┬──────────────────┘           │
       ▼                              ▼
┌─────────────────────────────────────────────┐
│           Google Gemini AI API               │
└─────────────────────────────────────────────┘
```

Both paths run the same code from `shared/` for prompt construction, response schemas, and Gemini calls.

## Technology Stack

### Frontend Framework
- **React 19**: Latest version with improved concurrent features
- **TypeScript**: Strict type checking for enhanced development experience
- **Vite 6**: Fast build tool and development server
- **Tailwind CSS 4**: Utility-first CSS framework, configured CSS-first in `index.css` (no `tailwind.config.js`)

### AI Integration
- **@google/genai SDK** (^1.52.0): Official client for the Gemini API
- **Gemini 3.5 Flash** (`gemini-3.5-flash`): Called with `responseMimeType: 'application/json'` and a response schema for structured output

### Backend
- **Vercel serverless functions** in `/api`: Hold the server-side `GEMINI_API_KEY` so it never ships to the browser

### Additional Libraries
- **jsPDF**: PDF report generation (no autotable dependency)
- **Lucide React**: Modern icon library
- **Vercel Analytics**: Usage tracking

## Project Structure

```
.
├── api/                  # Vercel serverless functions
│   ├── analyze.ts        # POST /api/analyze
│   ├── compare.ts        # POST /api/compare
│   ├── key-status.ts     # GET /api/key-status
│   └── _types.ts         # Handler types (underscore files are not deployed)
├── shared/               # Isomorphic modules (browser + serverless)
│   ├── analysisTypes.ts  # Request/report contracts, compliance scoring
│   └── labelAnalysis.ts  # Prompts, response schemas, Gemini runners
├── components/           # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MultiImageUploader.tsx
│   ├── BeverageCategorySelector.tsx
│   ├── AnalysisDisplay.tsx
│   ├── LabelComparison.tsx
│   ├── ComparisonResults.tsx
│   ├── LoadingSpinner.tsx
│   └── SettingsDropdown.tsx
├── contexts/
│   └── ThemeContext.tsx  # Light/dark theme provider (single source of truth)
├── services/             # Browser-side services
│   ├── geminiService.ts          # Key resolution + analysis entry points
│   ├── imageProcessingService.ts # Upload validation and downscaling
│   └── pdfService.ts             # PDF export
├── types.ts              # Label and beverage types/constants
├── constants.ts          # APP_VERSION (its only export)
├── App.tsx               # Main application component
├── index.tsx             # Entry point (wraps App in ThemeProvider)
├── index.html            # Minimal HTML template
└── vite.config.ts        # Build configuration (no key injection)
```

## API Key Handling

The Gemini API key is never embedded in the client bundle: `vite.config.ts` has no `define` block and `process.env.API_KEY` does not exist in client code. There are two key paths, resolved per request by `services/geminiService.ts`:

1. **Server key (default)** — the browser POSTs to the `/api` serverless functions, which read `GEMINI_API_KEY` from the server environment and call Gemini server-side.
2. **Bring your own key (BYOK)** — a key saved via the Settings dropdown is stored in localStorage under `alcohol-label-analyzer-api-key`. When present, the browser calls Gemini directly with that key and skips the server entirely (this also lifts the server payload limit).

## Component Architecture

### Core Components

**App.tsx** - Main application container
- Mode switch between "New Label" analysis and "Label Change" comparison
- Manages global state (images, `AnalysisReport` result, loading states, errors)
- Async API key presence check via `getApiKeyStatus()`; re-checks when the Settings dropdown saves or removes a key

**MultiImageUploader.tsx** - Image upload and management (analysis mode)
- Drag-and-drop plus per-label-type file pickers
- Uses `prepareImageForAnalysis` (5MB cap, pass-through or downscaling)
- Batches multi-file drops into a single state update

**AnalysisDisplay.tsx** - Results presentation
- Renders a structured `AnalysisReport` (no text parsing)
- Color-coded compliance badges straight from the status enum
- Expandable mandatory items, compliance score, PDF export

**LabelComparison.tsx / ComparisonResults.tsx** - Comparison mode
- Current vs. proposed upload with beverage category selection
- Renders a `ComparisonReport`: submission status, risk level, grouped changes with textual location descriptions, or a "No Differences Detected" panel

**BeverageCategorySelector.tsx** - Category selection
- TTB beverage category selection used by both modes

### Component Hierarchy

```
App (inside ThemeProvider)
├── Header
│   └── SettingsDropdown (API key management)
├── Mode selector (New Label / Label Change)
├── Analysis mode
│   ├── MultiImageUploader
│   ├── ProductRequirementsSelector (inline component)
│   ├── BeverageCategorySelector
│   └── AnalysisDisplay
├── Comparison mode
│   └── LabelComparisonComponent
│       ├── SingleImageUpload × 2 (inline component)
│       ├── BeverageCategorySelector
│       └── ComparisonResults
├── Footer
└── LoadingSpinner (conditional)
```

## Data Flow

### 1. Image Upload Flow

```
User selects images →
prepareImageForAnalysis (5MB validation, pass-through or downscale/re-encode) →
LabelImage objects created (base64 + preview) →
State updated →
UI refreshed
```

### 2. Analysis Flow

```
User clicks Analyze →
AnalyzeRequest built (images, category, requirements) →
analyzeLabels(): local key? direct Gemini call : POST /api/analyze →
Gemini returns schema-constrained JSON →
JSON.parse → AnalysisReport →
UI renders report
```

The comparison flow has the same shape (`compareLabels()` → `/api/compare` → `ComparisonReport`).

### 3. State Management

The application uses React's built-in state management with hooks:

```typescript
// Main application state
const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
const [analysisResult, setAnalysisResult] = useState<AnalysisReport | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
const [productRequirements, setProductRequirements] = useState<ProductRequirements>({ ... });
const [beverageCategory, setBeverageCategory] = useState<BeverageCategory>('distilled-spirits');
```

Theme state lives in `contexts/ThemeContext.tsx` — the single source of truth, which toggles the `dark` class on `<html>` and persists the choice to localStorage.

## API Integration

### Serverless Functions (`api/`)

- `analyze.ts` — POST; validates the body, runs `runLabelAnalysis` with the server key
- `compare.ts` — POST; validates both image lists, runs `runLabelComparison`
- `key-status.ts` — GET; reports whether a server key is configured; `?test=1` performs a live connectivity check
- All return JSON; errors are `{ error: string }` with 405/503/400/502 status codes

### Shared Modules (`shared/`)

- `analysisTypes.ts` — request/report contracts shared by browser and server, plus `calculateComplianceScore`
- `labelAnalysis.ts` — prompt builders, Gemini response schemas, `runLabelAnalysis` / `runLabelComparison` / `testGeminiConnection`, and error translation; used by both the BYOK browser path and the serverless functions

### Browser Service Layer (`services/geminiService.ts`)

**Key Functions:**
- `analyzeLabels()` / `compareLabels()`: Route to the local key or the serverless endpoints
- `getApiKeyStatus()`: Presence-only check (localStorage + `/api/key-status`) — no Gemini call
- `testApiConnection()`: Live test costing one tiny Gemini call; user-initiated only
- Server-bound requests are capped at ~4.2MB JSON (Vercel's ~4.5MB body limit) with a friendly error suggesting fewer/smaller images or a personal key

## Structured Output

Gemini is always called with `responseMimeType: 'application/json'` plus a `responseSchema`, so responses are consumed with a single `JSON.parse` — there is no markdown or regex parsing anywhere.

- The analysis schema yields an `AnalysisReport`: overall status, key issues, summary, mandatory items (each with a quoted `finding`, an enum `status`, and `notes`), and grouped observations.
- The comparison schema yields a `ComparisonReport`: an `identical` flag, submission requirement, risk level, reasoning, a `changes` array, recommendations, and a final determination.
- The comparison prompt explicitly allows a "no differences" outcome and forbids inventing changes. Each change carries a textual `location` description (e.g. "bottom-left of the front label") — pixel-coordinate highlighting was removed.

## Type System

### Core Types

**LabelImage Interface** (`types.ts`)
```typescript
interface LabelImage {
  id: string;
  file: File;
  labelType: LabelType;
  base64: string;
  mimeType: string;
  previewUrl: string;
  description?: string;
}
```

**Report Types** (`shared/analysisTypes.ts`)
```typescript
type ItemComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'POTENTIAL_ISSUE' | 'NOT_REQUIRED';

interface AnalysisReport {
  overallStatus: OverallComplianceStatus;
  keyIssues: string[];
  summary: string;
  mandatoryItems: AnalysisReportItem[];   // { title, finding, status, notes }
  observations: AnalysisObservation[];    // { title, points[] }
}
```

### Type Safety Features

- Strict TypeScript configuration
- One set of request/report contracts shared verbatim by browser and server
- Gemini response schemas mirror the TypeScript types, so parsed JSON matches the contracts
- Enum-based statuses rendered directly by the UI

## Prompt Engineering

All prompts live in `shared/labelAnalysis.ts`.

**Analysis prompt** (`buildAnalysisPrompt`):
1. Expert TTB role definition and beverage category
2. Per-image label-type context, with instructions to treat all images collectively
3. User-provided product facts (sulfites, Yellow No. 5, aspartame) as authoritative directives
4. A numbered mandatory-item checklist: 7 common items plus category-specific items (distilled spirits add items 8–15, wine 8–11, malt beverages none)

**Comparison prompt** (`buildComparisonPrompt`):
- Systematic element-by-element comparison checklist
- critical / minor / cosmetic classification rules tied to TTB submission impact
- Instructions to ignore photo-quality differences and never assume changes exist

## Error Handling

### Error Categories

**API Errors:**
- Invalid API key and quota errors (mapped to friendly messages by `translateGeminiError`)
- Network failures and server `{ error }` responses (405/503/400/502)

**User Input Errors:**
- No images uploaded
- Files over the 5MB cap, or unreadable/corrupt files
- Combined payload too large for the server path (~4.2MB)

**Analysis Errors:**
- Empty AI responses
- Unparseable JSON (both produce "please try again" messages)

### Error Recovery

- Graceful error messages with actionable guidance (add a personal key, use smaller images, run `vercel dev`)
- State preservation during errors
- The local-dev case (no `/api` routes under plain `vite dev`) is detected and explained

## Performance Considerations

### Image Processing

**Optimization Strategies:**
- Small supported files (PNG/JPEG/WEBP ≤ 1.5MB) pass through untouched; HEIC/HEIF always pass through (Gemini accepts them, browsers cannot canvas-decode them)
- Larger files are downscaled to a 2000px longest side and re-encoded as JPEG (quality 0.9) on a white background
- Data-URL previews for UI responsiveness
- Batched state updates for multi-file drops

### API Efficiency

**Request Optimization:**
- Single Gemini call per analysis/comparison with all images inlined
- Schema-constrained output removes any post-processing
- Page load performs only a cheap presence check; the live connection test is user-initiated

## Security Considerations

### API Key Management

- The server key exists only in the Vercel environment (`GEMINI_API_KEY`) and is never shipped to the browser
- A user-supplied key stays in the browser's localStorage and is sent only to Google, never to this app's servers
- Serverless functions return 503 when no server key is configured

### Data Privacy

- No server-side storage of images — the serverless functions are stateless proxies
- No persistent user data beyond the optional localStorage key and theme preference

### Input Validation

- Client: file-size cap, format handling, canvas re-encode
- Server: HTTP method checks, per-image shape validation (`base64` string, `image/*` MIME type), required-field checks

## Scalability and Extensibility

### Adding New Beverage Categories

1. Add the category to `BeverageCategory` and `BEVERAGE_CATEGORIES` in `types.ts`
2. Add its mandatory-item list to `CATEGORY_ITEMS` in `shared/labelAnalysis.ts`
3. The UI picks it up automatically via `BEVERAGE_CATEGORIES`

### Adding New Analysis Features

1. Extend the report contracts in `shared/analysisTypes.ts`
2. Update the prompt and `responseSchema` in `shared/labelAnalysis.ts` (keep them in sync)
3. Render the new fields in the display components

### Integration Points

- Isomorphic `shared/` modules keep browser and server behavior identical
- Component-based UI for feature additions
- Type-safe contracts for data consistency

## Build and Deployment

### Development Build

- Vite development server with HMR
- Note: plain `vite dev` has no `/api` routes — use `vercel dev`, or add a personal key via Settings

### Production Build

- `vite build` produces the optimized SPA bundle
- Vercel deploys `/api/*.ts` as serverless functions (underscore-prefixed files excluded)
- `GEMINI_API_KEY` is set as a Vercel environment variable

### Deployment Targets

- **Vercel**: Required for the serverless `/api` endpoints
- **Static hosting**: Possible, but only the BYOK path works (no server key)

## Monitoring and Analytics

- Vercel Analytics integration via the `<Analytics />` component in `App.tsx`

This architecture provides a solid foundation for the current application while maintaining flexibility for future enhancements and regulatory requirement changes.

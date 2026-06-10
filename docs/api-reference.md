# API Reference

## Overview

This document provides reference information for the HTTP endpoints exposed by the app's Vercel serverless functions, the browser-side service functions, the shared isomorphic runners, and the data contracts they exchange.

## HTTP Endpoints

The serverless functions live in `/api` (files starting with an underscore, such as `api/_types.ts`, are not deployed as endpoints). All endpoints speak JSON; errors are returned as `{ "error": string }` with an appropriate status code. The functions read their Gemini key from the `GEMINI_API_KEY` server environment variable.

When the user has saved their own API key via Settings, the browser skips these endpoints entirely and calls Gemini directly.

### `POST /api/analyze`

Runs a new-label compliance analysis with the server-side key.

**Request body** (`AnalyzeRequest`):
```json
{
  "images": [
    { "base64": "<image data>", "mimeType": "image/jpeg", "labelType": "front" }
  ],
  "beverageCategory": "distilled-spirits",
  "productRequirements": {
    "includesSulfites": true,
    "includesYellowNumberFive": false,
    "includesAspartame": false
  }
}
```

**Responses:**
- `200` — an `AnalysisReport` (see Type Definitions)
- `405` — method other than POST
- `503` — no `GEMINI_API_KEY` configured on the server
- `400` — missing/empty `images`, an image without a non-empty `base64` string and an `image/*` `mimeType`, or missing `beverageCategory`/`productRequirements`
- `502` — the Gemini call failed (the `error` message is already user-presentable)

### `POST /api/compare`

Compares current vs. proposed label versions.

**Request body** (`CompareRequest`):
```json
{
  "currentImages": [{ "base64": "<image data>", "mimeType": "image/png" }],
  "proposedImages": [{ "base64": "<image data>", "mimeType": "image/png" }],
  "beverageCategory": "wine"
}
```

**Responses:**
- `200` — a `ComparisonReport` (see Type Definitions)
- `405` / `503` — as above
- `400` — either image list missing, empty, or invalid; or missing `beverageCategory`
- `502` — the Gemini call failed

### `GET /api/key-status`

Reports whether the server has a Gemini key configured. Costs no Gemini call unless `?test=1` is passed.

**Responses (always `200` unless the method is wrong):**
- No server key: `{ "configured": false }`
- Server key present: `{ "configured": true }`
- With `?test=1` and a key present: `{ "configured": true, "live": boolean }` — `live` is the result of a real (tiny) Gemini call
- `405` — method other than GET

## Client Services

### `services/geminiService.ts`

Browser-side entry points for label analysis. Key resolution order: a key saved via Settings (localStorage key `alcohol-label-analyzer-api-key`) calls Gemini directly from the browser; otherwise requests go through the `/api` endpoints above.

#### `analyzeLabels()`

```typescript
async function analyzeLabels(request: AnalyzeRequest): Promise<AnalysisReport>
```

#### `compareLabels()`

```typescript
async function compareLabels(request: CompareRequest): Promise<ComparisonReport>
```

**Server-path payload cap:** when routing through `/api`, the JSON body is capped at ~4.2MB (Vercel rejects bodies over ~4.5MB). Oversized requests throw a friendly error suggesting fewer/smaller images or a personal API key. The cap does not apply on the direct (local-key) path.

**Local development:** plain `vite dev`/`vite preview` have no `/api` routes; the service detects the HTML fallback and throws an error suggesting a personal key or `vercel dev`.

#### `getApiKeyStatus()`

Presence-only check — looks at localStorage, then asks `/api/key-status`. Never costs a Gemini call.

```typescript
type ApiKeySource = 'local' | 'server' | 'none';

interface ApiKeyStatus {
  isConfigured: boolean;
  source: ApiKeySource;
}

async function getApiKeyStatus(): Promise<ApiKeyStatus>
```

#### `testApiConnection()`

Live connectivity test — costs one tiny Gemini call (directly with the local key, or via `/api/key-status?test=1`). Keep it user-initiated.

```typescript
async function testApiConnection(): Promise<boolean>
```

#### `getLocalApiKey()`

```typescript
function getLocalApiKey(): string | null
```

Returns the key saved via the Settings dropdown, if any.

### `services/imageProcessingService.ts`

#### `prepareImageForAnalysis()`

```typescript
interface PreparedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

async function prepareImageForAnalysis(file: File): Promise<PreparedImage>
```

- Throws if the file exceeds `MAX_FILE_SIZE_BYTES` (5MB)
- PNG/JPEG/WEBP files ≤ 1.5MB pass through untouched; HEIC/HEIF always pass through (Gemini accepts them, browsers cannot canvas-decode them)
- Everything else is drawn to a canvas — downscaled to a 2000px longest side if needed — composited onto a white background, and re-encoded as JPEG (quality 0.9)

Also exports `MAX_FILE_SIZE_BYTES` and `GEMINI_SUPPORTED_MIME_TYPES` (`image/png`, `image/jpeg`, `image/webp`, `image/heic`, `image/heif`).

### `services/pdfService.ts`

#### `generatePDFReport()`

```typescript
async function generatePDFReport(
  report: AnalysisReport,
  complianceScore?: ComplianceScore
): Promise<void>
```

Builds the report with jsPDF (no autotable dependency) and downloads `TTB_Compliance_Report_<timestamp>.pdf`. The optional score is rendered next to the overall status.

## Shared Modules

Isomorphic code in `shared/`, used by both the browser (local-key path) and the serverless functions. Keep these files free of browser- and Node-only APIs.

### `shared/labelAnalysis.ts`

#### `runLabelAnalysis()`

```typescript
async function runLabelAnalysis(apiKey: string, request: AnalyzeRequest): Promise<AnalysisReport>
```

Calls `GEMINI_MODEL` with all images inlined plus the analysis prompt, using `responseMimeType: 'application/json'` and the analysis `responseSchema`, then parses the response with `JSON.parse`. Throws if `request.images` is empty.

#### `runLabelComparison()`

```typescript
async function runLabelComparison(apiKey: string, request: CompareRequest): Promise<ComparisonReport>
```

Same pattern, with current images first, then proposed images, then the comparison prompt. Throws if either image list is empty.

#### `testGeminiConnection()`

```typescript
async function testGeminiConnection(apiKey: string): Promise<boolean>
```

Minimal end-to-end check (one tiny text generation); returns `false` on any failure.

#### `translateGeminiError()`

```typescript
function translateGeminiError(error: unknown, action: string): Error
```

Maps raw SDK errors to user-presentable messages (invalid key, quota exceeded, generic fallback).

#### Prompt builders

```typescript
function buildAnalysisPrompt(req: AnalyzeRequest): string
function buildComparisonPrompt(req: CompareRequest): string
```

#### `GEMINI_MODEL`

```typescript
const GEMINI_MODEL = 'gemini-3.5-flash';
```

## Type Definitions

### Request Types (`shared/analysisTypes.ts`)

```typescript
interface AnalysisImage {
  base64: string;
  mimeType: string;
  labelType: LabelType;
}

interface AnalyzeRequest {
  images: AnalysisImage[];
  beverageCategory: BeverageCategory;
  productRequirements: ProductRequirements;
}

interface ComparisonImage {
  base64: string;
  mimeType: string;
}

interface CompareRequest {
  currentImages: ComparisonImage[];
  proposedImages: ComparisonImage[];
  beverageCategory: BeverageCategory;
}
```

### Analysis Report Types (`shared/analysisTypes.ts`)

```typescript
type ItemComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'POTENTIAL_ISSUE' | 'NOT_REQUIRED';

type OverallComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Unable to Determine';

interface AnalysisReportItem {
  title: string;     // Exact item name from the mandatory checklist, e.g. "Brand Name"
  finding: string;   // What the label actually shows (quoted), or a statement that it is missing
  status: ItemComplianceStatus;
  notes: string;     // Explanation grounded in TTB rules
}

interface AnalysisObservation {
  title: string;
  points: string[];
}

interface AnalysisReport {
  overallStatus: OverallComplianceStatus;
  keyIssues: string[];
  summary: string;
  mandatoryItems: AnalysisReportItem[];
  observations: AnalysisObservation[];
}
```

### Comparison Report Types (`shared/analysisTypes.ts`)

```typescript
type ChangeSignificance = 'critical' | 'minor' | 'cosmetic';

type SubmissionRequirement = 'required' | 'recommended' | 'not-required' | 'uncertain';

interface ComparisonChange {
  category: string;        // Label element that changed, e.g. "Net Contents"
  significance: ChangeSignificance;
  currentValue: string;    // Exact text/description on the current label, or "not present"
  proposedValue: string;   // Exact text/description on the proposed label, or "not present"
  location: string;        // Human-readable area description, e.g. "bottom-left of the front label"
  impact: string;          // Why this change matters (or doesn't) for TTB submission
}

interface ComparisonReport {
  identical: boolean;      // True when no differences could be verified
  submissionRequired: SubmissionRequirement;
  riskLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  changes: ComparisonChange[];
  recommendations: string[];
  finalDetermination: string;
}
```

### `calculateComplianceScore()`

```typescript
interface ComplianceScore {
  compliant: number;
  total: number;
  percentage: number;
}

function calculateComplianceScore(report: AnalysisReport): ComplianceScore
```

Items with status `NOT_REQUIRED` are excluded from scoring entirely.

### Core Types (`types.ts`)

#### `LabelImage`

Represents an uploaded label image with metadata (client-side only — the `file` and `previewUrl` are never sent to the API).

```typescript
interface LabelImage {
  id: string;                    // Unique identifier
  file: File;                    // Original uploaded file
  labelType: LabelType;          // Type of label (front, back, etc.)
  base64: string;                // Base64 encoded image data
  mimeType: string;              // Image MIME type
  previewUrl: string;            // Data URL for preview
  description?: string;          // Optional user description
}
```

#### `LabelType`

```typescript
type LabelType = 'front' | 'back' | 'neck' | 'side' | 'other';
```

#### `ProductRequirements`

```typescript
interface ProductRequirements {
  includesSulfites: boolean;          // Product contains sulfites
  includesYellowNumberFive: boolean;  // Product contains FD&C Yellow #5
  includesAspartame: boolean;         // Product contains aspartame
}
```

#### `BeverageCategory`

```typescript
type BeverageCategory = 'distilled-spirits' | 'wine' | 'malt-beverages';
```

### Constants

- `LABEL_TYPES: LabelTypeInfo[]` and `BEVERAGE_CATEGORIES: BeverageCategoryInfo[]` (`types.ts`) — label-type and category metadata for the UI
- `APP_VERSION = "1.4.0"` — the only export of `constants.ts` (all prompts now live in `shared/labelAnalysis.ts`)

## Error Handling

Common error messages thrown to callers (verbatim from the source):

```typescript
// Validation (shared runners)
"No images provided for analysis."
"Both current and proposed images are required for comparison."

// Gemini errors (translateGeminiError)
"The configured Gemini API key is invalid. Please verify the key."
"The Gemini API quota has been exceeded. Please check usage and limits."
`Failed to ${action}: ${message || 'Unknown API error'}`

// Response problems (shared runners; <action> is e.g. "analyze the labels")
"Received an empty response from the AI while trying to <action>. The images might be unclear — please try again."
"The AI returned a response that could not be parsed while trying to <action>. Please try again."

// Client service (server path)
"The combined images are too large to send (over ~4 MB). Use fewer or smaller images, or add your own Gemini API key in Settings to lift this limit."
"Could not reach the analysis service. Check your connection and try again."
"The analysis endpoints are not available in this environment. Add your own Gemini API key via the Settings menu, or run the app with `vercel dev`."

// Image preparation
`File is too large (X.XXMB). Maximum allowed size is 5MB.`
```

The serverless functions return these same messages in `{ error }` bodies with a `502` status when a Gemini call fails.

## Usage Examples

### Complete Analysis Workflow

```typescript
import { analyzeLabels } from './services/geminiService';
import { prepareImageForAnalysis } from './services/imageProcessingService';
import { AnalyzeRequest } from './shared/analysisTypes';

async function analyze(frontFile: File, backFile: File) {
  const front = await prepareImageForAnalysis(frontFile);
  const back = await prepareImageForAnalysis(backFile);

  const request: AnalyzeRequest = {
    images: [
      { base64: front.base64, mimeType: front.mimeType, labelType: 'front' },
      { base64: back.base64, mimeType: back.mimeType, labelType: 'back' },
    ],
    beverageCategory: 'distilled-spirits',
    productRequirements: {
      includesSulfites: true,
      includesYellowNumberFive: false,
      includesAspartame: false,
    },
  };

  const report = await analyzeLabels(request); // AnalysisReport
  console.log(report.overallStatus, report.mandatoryItems.length);
}
```

### Label Comparison

```typescript
import { compareLabels } from './services/geminiService';

const report = await compareLabels({
  currentImages: [{ base64: currentB64, mimeType: 'image/jpeg' }],
  proposedImages: [{ base64: proposedB64, mimeType: 'image/jpeg' }],
  beverageCategory: 'wine',
});

if (report.identical) {
  console.log('No differences detected');
}
```

### PDF Report Generation

```typescript
import { generatePDFReport } from './services/pdfService';
import { calculateComplianceScore } from './shared/analysisTypes';

await generatePDFReport(report, calculateComplianceScore(report));
```

### API Key Status

```typescript
import { getApiKeyStatus, testApiConnection } from './services/geminiService';

const { isConfigured, source } = await getApiKeyStatus(); // presence-only, no Gemini call
const live = await testApiConnection();                   // one tiny Gemini call — keep user-initiated
```

## Environment Variables

```bash
# Server-side only (Vercel environment) — read by the /api functions.
# Never embedded in the client bundle.
GEMINI_API_KEY=your_gemini_api_key_here
```

There are no client-side API key environment variables. A user-supplied key is stored in the browser under the localStorage key `alcohol-label-analyzer-api-key`.

## Limits

- **Per image (client)**: 5MB original-file cap, enforced before upload. Supported files over 1.5MB (and non-pass-through formats) are downscaled to 2000px / JPEG q0.9.
- **Per request (server path)**: ~4.2MB JSON payload, under Vercel's ~4.5MB body limit. Direct local-key calls are not subject to this cap.
- **Images per analysis**: up to 5 in the UI (`maxImages` on `MultiImageUploader`); comparison mode uses one current and one proposed image.
- **Gemini quotas**: requests per minute vary by API key tier.

## Version Compatibility

### API Versions

- **Gemini model**: `gemini-3.5-flash`
- **@google/genai SDK**: ^1.52.0
- **jsPDF**: ^4.2.1 (jspdf-autotable and @types/jspdf removed)
- **React**: ^19.1
- **Vite**: ^6.2
- **TypeScript**: ~5.7

### Breaking Changes from Pre-1.4

- The old service functions (`analyzeLabelViaservice`, `analyzeMultipleLabelsViaService`, `compareLabelVersionsViaService`) and the `GEMINI_MODEL_NAME` constant were removed.
- Results are structured JSON reports (`AnalysisReport` / `ComparisonReport`), not markdown text — all text-parsing types (`ParsedAnalysis`, section keys, etc.) are gone.
- `getApiKeyStatus()` is now async and returns `{ isConfigured, source }`.

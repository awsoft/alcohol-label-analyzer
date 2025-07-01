# API Reference

## Overview

This document provides comprehensive reference information for all APIs, services, and interfaces used in the Alcohol Label Compliance Analyzer application.

## Gemini AI Service

### `geminiService.ts`

Main service for interacting with Google's Gemini AI API for label analysis.

#### Functions

##### `analyzeMultipleLabelsViaService()`

Analyzes multiple label images for TTB compliance.

```typescript
async function analyzeMultipleLabelsViaService(
  images: LabelImage[],
  beverageCategory: BeverageCategory,
  productRequirements?: ProductRequirements
): Promise<string>
```

**Parameters:**
- `images` - Array of label images to analyze
- `beverageCategory` - Type of alcoholic beverage (distilled-spirits, wine, malt-beverages)
- `productRequirements` - Optional product-specific ingredient requirements

**Returns:**
- `Promise<string>` - Detailed TTB compliance analysis text

**Throws:**
- API key configuration errors
- Gemini API quota/authentication errors
- Network/service errors

**Example:**
```typescript
const result = await analyzeMultipleLabelsViaService(
  labelImages,
  'distilled-spirits',
  {
    includesSulfites: true,
    includesYellowNumberFive: false,
    includesAspartame: false
  }
);
```

##### `analyzeLabelViaservice()` (Legacy)

Single image analysis function maintained for backward compatibility.

```typescript
async function analyzeLabelViaservice(
  imageBase64: string,
  mimeType: string,
  beverageCategory: BeverageCategory,
  productRequirements?: ProductRequirements
): Promise<string>
```

##### `getApiKeyStatus()`

Checks the status of the Gemini API key configuration.

```typescript
function getApiKeyStatus(): {
  isConfigured: boolean;
  status: string;
}
```

**Returns:**
- `isConfigured` - Boolean indicating if API key is properly set
- `status` - Human-readable status message

#### Constants

##### `GEMINI_MODEL_NAME`

```typescript
const GEMINI_MODEL_NAME = 'Gemini 2.5 Flash Preview';
```

The display name of the AI model being used.

## PDF Service

### `pdfService.ts`

Service for generating PDF reports from analysis results.

#### Functions

##### `generatePDFReport()`

Generates a formatted PDF report from analysis results.

```typescript
function generatePDFReport(
  analysisResult: string,
  productRequirements: ProductRequirements,
  beverageCategory: BeverageCategory
): void
```

**Parameters:**
- `analysisResult` - Raw analysis text from AI
- `productRequirements` - Product ingredient requirements
- `beverageCategory` - Selected beverage category

**Effect:**
- Downloads a PDF file to the user's device
- PDF contains formatted analysis with professional styling

## Type Definitions

### Core Types

#### `LabelImage`

Represents an uploaded label image with metadata.

```typescript
interface LabelImage {
  id: string;                    // Unique identifier
  file: File;                    // Original uploaded file
  labelType: LabelType;          // Type of label (front, back, etc.)
  base64: string;                // Base64 encoded image data
  mimeType: string;              // Image MIME type
  previewUrl: string;            // Object URL for preview
  description?: string;          // Optional user description
}
```

#### `LabelType`

Enum for different types of alcohol labels.

```typescript
type LabelType = 'front' | 'back' | 'neck' | 'side' | 'other';
```

#### `LabelTypeInfo`

Metadata for label types.

```typescript
interface LabelTypeInfo {
  id: LabelType;
  name: string;
  description: string;
}
```

#### `ProductRequirements`

User-specified product ingredient requirements.

```typescript
interface ProductRequirements {
  includesSulfites: boolean;          // Product contains sulfites
  includesYellowNumberFive: boolean;  // Product contains FD&C Yellow #5
  includesAspartame: boolean;         // Product contains aspartame
}
```

#### `BeverageCategory`

TTB beverage classification.

```typescript
type BeverageCategory = 'distilled-spirits' | 'wine' | 'malt-beverages';
```

#### `BeverageCategoryInfo`

Metadata for beverage categories.

```typescript
interface BeverageCategoryInfo {
  id: BeverageCategory;
  name: string;
  description: string;
  examples: string[];
}
```

### Analysis Result Types

#### `ParsedAnalysis`

Structured representation of analysis results.

```typescript
interface ParsedAnalysis {
  overview: ReportOverviewData | null;
  sections: ReportSectionData[];
}
```

#### `ReportOverviewData`

Compliance overview information.

```typescript
interface ReportOverviewData {
  status: ComplianceStatus;
  statusText: string;
  keyIssues: string[];
}
```

#### `ComplianceStatus`

Overall compliance rating.

```typescript
type ComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Unknown';
```

#### `ReportSectionData`

Individual section of the analysis report.

```typescript
interface ReportSectionData {
  id: string;
  title: string;
  key: SectionKey;
  items?: ReportItem[];
  observationSubSections?: ObservationSubSection[];
  freeTextContent?: string[];
}
```

#### `SectionKey`

Predefined section types.

```typescript
type SectionKey = 'overview' | 'mandatory_info' | 'observations' | 'summary';
```

#### `ReportItem`

Individual compliance item within a section.

```typescript
interface ReportItem {
  id: string;
  title: string;
  fullItemTitle: string;
  details: ReportDetail[];
}
```

#### `ReportDetail`

Specific detail within a report item.

```typescript
interface ReportDetail {
  label: string;
  value: string;
  isComplianceNote?: boolean;
}
```

#### `ObservationSubSection`

Subsection within observations.

```typescript
interface ObservationSubSection {
  title: string;
  points: string[];
}
```

### Constants

#### `LABEL_TYPES`

Array of available label types with metadata.

```typescript
const LABEL_TYPES: LabelTypeInfo[] = [
  {
    id: 'front',
    name: 'Front Label',
    description: 'Main product label (front)'
  },
  // ... other types
];
```

#### `BEVERAGE_CATEGORIES`

Array of beverage categories with metadata.

```typescript
const BEVERAGE_CATEGORIES: BeverageCategoryInfo[] = [
  {
    id: 'distilled-spirits',
    name: 'Distilled Spirits',
    description: 'Vodka, whiskey, rum, gin, brandy, and other distilled alcoholic beverages',
    examples: ['Vodka', 'Whiskey', 'Rum', 'Gin', 'Brandy', 'Tequila']
  },
  // ... other categories
];
```

#### `APP_VERSION`

Current application version.

```typescript
const APP_VERSION = "1.2.0";
```

## Constants and Configuration

### Prompt Engineering

#### `getCategorySpecificPrompt()`

Generates category-specific analysis prompts.

```typescript
function getCategorySpecificPrompt(category: BeverageCategory): string
```

**Parameters:**
- `category` - Beverage category for prompt customization

**Returns:**
- Formatted prompt string for AI analysis

#### `GEMINI_PROMPT`

Legacy base prompt for backward compatibility.

```typescript
const GEMINI_PROMPT: string;
```

## Error Handling

### Error Types

Common error scenarios and their handling:

#### API Configuration Errors

```typescript
// Thrown when API key is missing or invalid
throw new Error("Gemini API Key is not configured. Please contact support or check environment variables.");
```

#### API Quota Errors

```typescript
// Thrown when API quota is exceeded
throw new Error("You have exceeded your Gemini API quota. Please check your usage and limits.");
```

#### Validation Errors

```typescript
// Thrown when no images are provided
throw new Error("No images provided for analysis.");
```

#### Network Errors

```typescript
// Thrown for network or service failures
throw new Error(`Failed to analyze labels: ${error.message || 'Unknown API error'}`);
```

## Usage Examples

### Complete Analysis Workflow

```typescript
import { analyzeMultipleLabelsViaService } from './services/geminiService';
import { LabelImage, BeverageCategory, ProductRequirements } from './types';

// Example usage
async function analyzeLabels() {
  const images: LabelImage[] = [
    {
      id: 'front-label-1',
      file: frontLabelFile,
      labelType: 'front',
      base64: frontLabelBase64,
      mimeType: 'image/jpeg',
      previewUrl: frontLabelPreview
    },
    {
      id: 'back-label-1',
      file: backLabelFile,
      labelType: 'back',
      base64: backLabelBase64,
      mimeType: 'image/jpeg',
      previewUrl: backLabelPreview
    }
  ];

  const category: BeverageCategory = 'distilled-spirits';
  
  const requirements: ProductRequirements = {
    includesSulfites: true,
    includesYellowNumberFive: false,
    includesAspartame: false
  };

  try {
    const result = await analyzeMultipleLabelsViaService(
      images,
      category,
      requirements
    );
    
    console.log('Analysis result:', result);
  } catch (error) {
    console.error('Analysis failed:', error);
  }
}
```

### PDF Report Generation

```typescript
import { generatePDFReport } from './services/pdfService';

// Generate PDF from analysis results
generatePDFReport(analysisResult, productRequirements, beverageCategory);
```

### API Key Validation

```typescript
import { getApiKeyStatus } from './services/geminiService';

const { isConfigured, status } = getApiKeyStatus();

if (!isConfigured) {
  console.warn('API key not configured:', status);
}
```

## Environment Variables

### Required Variables

```bash
# Google Gemini API key for AI analysis
API_KEY=your_gemini_api_key_here
```

### Optional Variables

```bash
# Application version override
VITE_APP_VERSION=1.2.0
```

## Rate Limits and Quotas

### Gemini API Limits

- **Requests per minute**: Varies by API key tier
- **Image size**: Maximum 10MB per image
- **Images per request**: Up to 5 images supported
- **Request timeout**: 60 seconds

### Recommendations

- Implement client-side image compression
- Add retry logic for transient failures
- Monitor quota usage in production
- Cache results when appropriate

## Version Compatibility

### API Versions

- **Gemini API**: Uses latest stable version
- **Google GenAI SDK**: v1.6.0+
- **React**: v19.x
- **TypeScript**: v5.7+

### Backward Compatibility

- Legacy single-image analysis function maintained
- Type definitions remain stable across minor versions
- Environment variable configuration unchanged
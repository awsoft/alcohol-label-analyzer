# Architecture Overview

## System Architecture

The Alcohol Label Compliance Analyzer is built as a modern single-page application (SPA) using React with TypeScript. The architecture follows a component-based design with clear separation of concerns.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│              Frontend (React)            │
├─────────────────────────────────────────┤
│ Components │ Services │ Types │ Utils   │
├─────────────────────────────────────────┤
│              API Gateway                 │
├─────────────────────────────────────────┤
│           Google Gemini AI API           │
└─────────────────────────────────────────┘
```

## Technology Stack

### Frontend Framework
- **React 19**: Latest version with improved concurrent features
- **TypeScript**: Strict type checking for enhanced development experience
- **Vite**: Fast build tool and development server
- **Tailwind CSS**: Utility-first CSS framework for styling

### AI Integration
- **Google Generative AI SDK**: Official client for Gemini API
- **Gemini 2.5 Flash Preview**: Latest model optimized for image analysis

### Additional Libraries
- **jsPDF + autoTable**: PDF report generation
- **Lucide React**: Modern icon library
- **Vercel Analytics**: Performance and usage tracking

## Project Structure

```
src/
├── components/           # React components
│   ├── Header.tsx
│   ├── Footer.tsx
│   ├── MultiImageUploader.tsx
│   ├── BeverageCategorySelector.tsx
│   ├── AnalysisDisplay.tsx
│   ├── LoadingSpinner.tsx
│   ├── ImageUploader.tsx
│   └── SettingsDropdown.tsx
├── services/            # API and external services
│   ├── geminiService.ts
│   └── pdfService.ts
├── types.ts            # TypeScript type definitions
├── constants.ts        # Application constants and prompts
├── App.tsx            # Main application component
├── index.tsx          # Application entry point
├── index.html         # HTML template
└── vite.config.ts     # Build configuration
```

## Component Architecture

### Core Components

**App.tsx** - Main application container
- Manages global state (images, analysis results, loading states)
- Orchestrates the analysis workflow
- Handles error states and API key validation

**MultiImageUploader.tsx** - Image upload and management
- File drag-and-drop functionality
- Image preprocessing and validation
- Label type assignment and descriptions
- Preview and removal capabilities

**AnalysisDisplay.tsx** - Results presentation
- Structured parsing of AI analysis results
- Color-coded compliance status
- Expandable sections with detailed information
- PDF export functionality

**BeverageCategorySelector.tsx** - Category selection
- TTB beverage category selection
- Category-specific requirement information
- Visual indicators and descriptions

### Component Hierarchy

```
App
├── Header
├── MultiImageUploader
│   └── Individual image cards with controls
├── ProductRequirementsSelector (inline component)
├── BeverageCategorySelector
├── AnalysisDisplay
│   ├── Compliance overview
│   ├── Report sections
│   └── PDF export controls
├── Footer
└── LoadingSpinner (conditional)
```

## Data Flow

### 1. Image Upload Flow

```
User selects images → 
File validation → 
Base64 conversion → 
LabelImage objects created → 
State updated → 
UI refreshed
```

### 2. Analysis Flow

```
User clicks Analyze → 
Validation checks → 
Loading state activated → 
Images + requirements sent to Gemini API → 
Response received → 
Results parsed and structured → 
UI updated with results
```

### 3. State Management

The application uses React's built-in state management with hooks:

```typescript
// Main application state
const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
const [analysisResult, setAnalysisResult] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [productRequirements, setProductRequirements] = useState<ProductRequirements>({});
const [beverageCategory, setBeverageCategory] = useState<BeverageCategory>('distilled-spirits');
```

## API Integration

### Gemini AI Service

**Service Layer** (`services/geminiService.ts`)
- Handles all Gemini API communication
- Image processing and optimization
- Prompt construction based on beverage category
- Error handling and retry logic

**Key Functions:**
- `analyzeMultipleLabelsViaService()`: Main analysis function
- `getApiKeyStatus()`: API key validation
- Error handling for common API issues

### API Request Structure

```typescript
interface AnalysisRequest {
  images: LabelImage[];           // Base64 encoded images
  beverageCategory: BeverageCategory;
  productRequirements: ProductRequirements;
}
```

## Type System

### Core Types

**LabelImage Interface**
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

**Analysis Result Types**
```typescript
interface ParsedAnalysis {
  overview: ReportOverviewData | null;
  sections: ReportSectionData[];
}

interface ReportSectionData {
  id: string;
  title: string;
  key: SectionKey;
  items?: ReportItem[];
  observationSubSections?: ObservationSubSection[];
  freeTextContent?: string[];
}
```

### Type Safety Features

- Strict TypeScript configuration
- Comprehensive type definitions for all data structures
- Runtime type validation for API responses
- Enum-based constants for reliability

## Prompt Engineering

### Dynamic Prompt Construction

The application uses sophisticated prompt engineering to ensure accurate analysis:

**Base Prompt Structure:**
1. Expert role definition
2. Analysis instructions
3. Required compliance status phrases
4. Structured output format

**Category-Specific Prompts:**
- Distilled spirits: 15+ specific requirements
- Wine: 11+ wine-specific requirements  
- Malt beverages: Simplified requirement set

**Multi-Image Instructions:**
- Context about each image type
- Instructions to analyze collectively
- Guidance on finding information across images

## Error Handling

### Error Categories

**API Errors:**
- Invalid API key
- Quota exceeded
- Network failures
- Service unavailable

**User Input Errors:**
- No images uploaded
- Unsupported file formats
- File size limits exceeded
- Missing required configuration

**Analysis Errors:**
- Empty AI responses
- Parsing failures
- Unclear image content

### Error Recovery

- Graceful error messages with actionable guidance
- Retry mechanisms for transient failures
- State preservation during errors
- Clear error categorization for users

## Performance Considerations

### Image Processing

**Optimization Strategies:**
- Client-side image compression
- Base64 encoding for API transmission
- Preview generation for UI responsiveness
- File size validation and limits

**Memory Management:**
- Cleanup of object URLs
- Efficient state updates
- Minimal re-renders during upload

### API Efficiency

**Request Optimization:**
- Single API call for multiple images
- Efficient prompt construction
- Minimal data transmission

## Security Considerations

### API Key Management

- Environment variable configuration
- No hardcoded credentials
- Client-side API key validation
- Secure key rotation support

### Data Privacy

- No server-side storage of images
- Client-side processing only
- Temporary image URLs with cleanup
- No persistent user data storage

### Input Validation

- File type restrictions
- Size limit enforcement
- Content validation
- Malicious file protection

## Scalability and Extensibility

### Adding New Beverage Categories

1. Add category to `BeverageCategory` type
2. Update `BEVERAGE_CATEGORIES` constant
3. Add category-specific prompt in `constants.ts`
4. Update UI components as needed

### Adding New Analysis Features

1. Extend type definitions
2. Update prompt engineering
3. Modify result parsing logic
4. Add UI components for new features

### Integration Points

- Modular service architecture for easy API swapping
- Component-based UI for feature additions
- Type-safe interfaces for data consistency
- Configurable prompts for requirement changes

## Build and Deployment

### Development Build

- Vite development server with HMR
- TypeScript compilation checking
- Source maps for debugging
- Environment variable loading

### Production Build

- Optimized bundle creation
- Asset compression and optimization
- Tree-shaking for minimal bundle size
- Type checking during build

### Deployment Targets

- **Vercel**: Optimized for seamless deployment
- **Static hosting**: Compatible with any static host
- **CDN**: Cacheable assets for global distribution

## Monitoring and Analytics

### Performance Tracking

- Vercel Analytics integration
- Core Web Vitals monitoring
- User interaction tracking
- Error rate monitoring

### Usage Metrics

- Analysis completion rates
- Most common beverage categories
- Image upload patterns
- Error frequency and types

This architecture provides a solid foundation for the current application while maintaining flexibility for future enhancements and regulatory requirement changes.
# Components Guide

## Overview

This guide provides detailed documentation for all React components in the Alcohol Label Compliance Analyzer application. Each component is documented with its purpose, props, usage examples, and implementation details.

## Core Components

### App.tsx

Main application container that orchestrates the entire analysis workflow.

**Purpose**: Primary component that manages global state, switches between the two app modes ("New Label" analysis and "Label Change" comparison), and coordinates all other components.

**Key Features**:
- Global state management for images, analysis results, loading states
- Async API key presence check via `getApiKeyStatus()` (server key or local key); re-checks when the Settings dropdown changes the key
- Analysis workflow orchestration via `analyzeLabels()`
- Product requirements configuration (inline `ProductRequirementsSelector` component)
- Mode selector (inline `ModeSelector` component)

**State Management**:
```typescript
const [appMode, setAppMode] = useState<AppMode>('analysis'); // 'analysis' | 'comparison'
const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
const [analysisResult, setAnalysisResult] = useState<AnalysisReport | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
const [productRequirements, setProductRequirements] = useState<ProductRequirements>({ ... });
const [beverageCategory, setBeverageCategory] = useState<BeverageCategory>('distilled-spirits');
```

### Header.tsx

Application header with theme toggle and settings access.

**Props**:
```typescript
interface HeaderProps {
  onApiKeyChange?: () => void;  // Forwarded to SettingsDropdown; lets App re-check key status
}
```

**Features**:
- Uses `useTheme()` from `contexts/ThemeContext` (single theme source of truth — no local theme state)
- Light/dark theme toggle button
- Settings dropdown access
- Aardwolf branding and logo (theme-aware image)

**Usage**:
```tsx
<Header onApiKeyChange={refreshApiKeyStatus} />
```

### Footer.tsx

Application footer with attribution and links.

**Features**:
- Theme-aware Aardwolf logo (scrolls to top on click)
- Contact email and LinkedIn links
- Copyright notice
- Responsive layout

### MultiImageUploader.tsx

Advanced image upload component supporting multiple label types (analysis mode).

**Props**:
```typescript
interface MultiImageUploaderProps {
  images: LabelImage[];
  onImagesChange: (images: LabelImage[]) => void;
  disabled?: boolean;
  maxImages?: number;  // default 5
}
```

**Key Features**:
- Drag-and-drop file upload plus per-label-type file pickers
- Supported formats: PNG, JPEG, WEBP, HEIC, HEIF
- Label type assignment (front, back, neck, side, other) with per-image selector
- Image preview and removal
- File size validation (5MB limit per image)

**Image Processing**:
- Delegates to `prepareImageForAnalysis()` (validation, pass-through or downscale/re-encode, preview generation)
- Multi-file drops are batched into a single `onImagesChange` state update
- Per-file errors are collected and displayed without blocking other files

**Usage**:
```tsx
<MultiImageUploader
  images={labelImages}
  onImagesChange={setLabelImages}
  disabled={isLoading}
  maxImages={5}
/>
```

### BeverageCategorySelector.tsx

Component for selecting TTB beverage categories. Used by both the analysis and comparison modes.

**Props**:
```typescript
interface BeverageCategorySelectorProps {
  selectedCategory: BeverageCategory;
  onCategoryChange: (category: BeverageCategory) => void;
  disabled?: boolean;
}
```

**Features**:
- Three category options: distilled-spirits, wine, malt-beverages
- Category descriptions and examples (from `BEVERAGE_CATEGORIES`)
- Visual indicators for selection
- Disabled state during analysis

**Categories**:
- **Distilled Spirits**: Vodka, whiskey, rum, gin, brandy, tequila
- **Wine**: Table wine, sparkling wine, dessert wine, cider, mead
- **Malt Beverages**: Beer, ale, lager, stout, IPA, porter

### AnalysisDisplay.tsx

Component for displaying a structured analysis report.

**Props**:
```typescript
interface AnalysisDisplayProps {
  report: AnalysisReport;
}
```

**Key Features**:
- Renders the structured `AnalysisReport` directly — no text parsing
- Overview bar with overall status, compliance score (`calculateComplianceScore`, which excludes `NOT_REQUIRED` items), and key issues (falls back to listing non-compliant items when the model returns none)
- Status badges rendered directly from the enum: Compliant / Non-Compliant / Potential Issue / Not Required
- Expandable mandatory items showing **"On the label:"** (the `finding`) and **"TTB Compliance Notes:"** (the `notes`)
- Observation groups with bullet points
- PDF download button that calls `generatePDFReport(report, complianceScore)`

**Compliance Status Colors**:
- **Green**: Compliant
- **Red**: Non-Compliant
- **Orange**: Potential Issue
- **Gray**: Not Required

### LabelComparison.tsx

Comparison-mode container (`LabelComparisonComponent`) for analyzing label changes.

**Props**:
```typescript
interface LabelComparisonProps {
  disabled?: boolean;
}
```

**Key Features**:
- Side-by-side upload of one current ("Approved") and one proposed ("New Design") label image (inline `SingleImageUpload` component with drag-and-drop)
- Own `BeverageCategorySelector` (the category is no longer hardcoded to distilled spirits)
- Uploads go through `prepareImageForAnalysis()` (5MB cap and downscaling apply to comparison mode too)
- Calls `compareLabels()` and renders the result with `ComparisonResults`

### ComparisonResults.tsx

Component for displaying a structured comparison report.

**Props**:
```typescript
interface ComparisonResultsProps {
  report: ComparisonReport;
}
```

**Key Features**:
- Submission status header (Required / Recommended / Not Required / Uncertain) with reasoning
- Risk level badge (high / medium / low)
- Stats grid with total/critical/minor/cosmetic counts derived from the `changes` array
- Changes grouped by significance, each showing current vs. proposed values, a textual `location` description, and TTB impact
- A green "No Differences Detected" panel when `report.identical` is true or the changes array is empty
- Recommendations list and final determination

No images or canvas drawing — change locations are text descriptions, not coordinate overlays.

### LoadingSpinner.tsx

Simple loading indicator component.

**Features**:
- Animated SVG spinner with consistent styling
- Tailwind CSS styling

**Usage**:
```tsx
<LoadingSpinner />
```

### SettingsDropdown.tsx

Settings panel with API key management.

**Props**:
```typescript
interface SettingsDropdownProps {
  onApiKeyChange?: () => void;  // Called after saving or removing a key so App re-checks status
}
```

**Features**:
- On mount, runs a presence-only check via `getApiKeyStatus()` — no Gemini call on page load
- Status display: `checking` / `configured` ("Server key configured" or "Your key (untested)" depending on the key source) / `connected` / `error` ("Connection failed") / `not-configured`
- "Test Connection" button runs the live test via `testApiConnection()` (one tiny Gemini call)
- Add/update/remove a personal Gemini API key, stored in localStorage under `alcohol-label-analyzer-api-key`; saving or removing calls `onApiKeyChange`
- Explains that a personal key stays in the browser and calls Gemini directly
- Application version display (`APP_VERSION`)

## Contexts

### ThemeContext.tsx

Single source of truth for the light/dark theme.

**Exports**: `ThemeProvider` (wraps `App` in `index.tsx`) and `useTheme()` returning `{ theme, toggleTheme }`.

**Behavior**:
- Initial theme from localStorage (`theme` key), falling back to the system preference
- Applies/removes the `dark` class on `document.documentElement` (which drives Tailwind's `dark:` variant)
- Persists changes to localStorage

## Component Patterns

### State Management Pattern

Most components follow a controlled component pattern:

```typescript
// Parent component manages state
const [value, setValue] = useState<Type>(initialValue);

// Child component receives props
<ChildComponent
  value={value}
  onChange={setValue}
  disabled={isLoading}
/>
```

### Error Handling Pattern

Components include graceful error display:

```typescript
// Error state management
const [error, setError] = useState<string | null>(null);

// Error display
{error && (
  <div className="error-message">
    <AlertTriangle className="h-6 w-6" />
    <p>{error}</p>
  </div>
)}
```

### Loading State Pattern

Components consistently handle loading states:

```typescript
// Loading state in UI
{isLoading ? (
  <LoadingSpinner />
) : (
  <ActionButton />
)}
```

## Styling Approach

### Tailwind CSS

All components use Tailwind CSS (v4) for styling. Configuration is CSS-first in `index.css` (`@import "tailwindcss"` plus `@theme` — there is no `tailwind.config.js`):

```tsx
<div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6">
  <h2 className="text-3xl font-bold mb-8 text-sky-600 dark:text-sky-400">
    Title
  </h2>
</div>
```

### Dark Mode Support

The `dark:` variant is bound to the `dark` class on `<html>` (set by `ThemeContext`) via `@custom-variant` in `index.css`:

```tsx
className="bg-slate-50 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
```

### Responsive Design

Components use responsive classes:

```tsx
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

## Accessibility Features

### Keyboard Navigation

Components support keyboard navigation:

```tsx
<button
  onKeyDown={(e) => e.key === 'Enter' && handleAction()}
  tabIndex={0}
>
  Action
</button>
```

### Screen Reader Support

Components include proper ARIA labels:

```tsx
<button aria-label="Remove image">
  <XCircle size={16} />
</button>
```

## Performance Considerations

### Memoization

Derived values use `useMemo`:

```typescript
// AnalysisDisplay.tsx
const complianceScore = useMemo(() => calculateComplianceScore(report), [report]);
```

### Callback Optimization

Event handlers use `useCallback`:

```typescript
const handleImagesChange = useCallback((newImages: LabelImage[]) => {
  setLabelImages(newImages);
  setError(null);
}, []);
```

### Effect Dependencies

useEffect hooks have proper dependencies:

```typescript
// App.tsx — async key presence check on mount
const refreshApiKeyStatus = useCallback(() => {
  getApiKeyStatus().then(({ isConfigured }) => setApiKeyMissing(!isConfigured));
}, []);

useEffect(() => {
  refreshApiKeyStatus();
}, [refreshApiKeyStatus]);
```

## Component Testing

### Test Structure

Components should be tested with:

```typescript
describe('ComponentName', () => {
  test('renders correctly', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('handles user interactions', () => {
    const mockHandler = jest.fn();
    render(<ComponentName onChange={mockHandler} />);
    fireEvent.click(screen.getByRole('button'));
    expect(mockHandler).toHaveBeenCalled();
  });
});
```

## Best Practices

### Component Design

1. **Single Responsibility**: Each component has one clear purpose
2. **Prop Interface**: Clear TypeScript interfaces for all props
3. **Error Handling**: Graceful error states and user feedback
4. **Loading States**: Consistent loading indicators
5. **Accessibility**: ARIA labels and keyboard navigation

### State Management

1. **Minimal State**: Keep component state minimal
2. **Lifting State**: Lift state to appropriate parent level
3. **Immutable Updates**: Use functional state updates
4. **Batched Updates**: Collect multi-file results before a single state update (see `MultiImageUploader`)

### Performance

1. **Memoized Values**: Use useMemo for derived data
2. **Callback Memoization**: Use useCallback for event handlers
3. **Effect Dependencies**: Proper dependency arrays
4. **Conditional Rendering**: Avoid unnecessary re-renders

## Future Enhancements

### Planned Improvements

1. **Component Library**: Extract reusable components
2. **Testing Coverage**: Comprehensive test suite
3. **Performance Monitoring**: Component render tracking
4. **Accessibility Audit**: Full accessibility compliance
5. **Documentation**: Interactive component documentation

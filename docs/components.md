# Components Guide

## Overview

This guide provides detailed documentation for all React components in the Alcohol Label Compliance Analyzer application. Each component is documented with its purpose, props, usage examples, and implementation details.

## Core Components

### App.tsx

Main application container that orchestrates the entire analysis workflow.

**Purpose**: Primary component that manages global state and coordinates all other components.

**Key Features**:
- Global state management for images, analysis results, loading states
- API key validation and error handling
- Analysis workflow orchestration
- Product requirements configuration

**State Management**:
```typescript
const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
const [analysisResult, setAnalysisResult] = useState<string | null>(null);
const [isLoading, setIsLoading] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [productRequirements, setProductRequirements] = useState<ProductRequirements>({});
const [beverageCategory, setBeverageCategory] = useState<BeverageCategory>('distilled-spirits');
```

### Header.tsx

Application header with status indicator and navigation.

**Props**:
```typescript
interface HeaderProps {
  analysisStatus: string;
}
```

**Features**:
- Real-time analysis status display
- Settings dropdown access
- Aardwolf branding and logo
- Responsive design with mobile support

**Usage**:
```tsx
<Header analysisStatus="Ready" />
```

### Footer.tsx

Application footer with attribution and links.

**Features**:
- Aardwolf attribution
- Version information
- Links to TTB resources
- Responsive layout

### MultiImageUploader.tsx

Advanced image upload component supporting multiple label types.

**Props**:
```typescript
interface MultiImageUploaderProps {
  images: LabelImage[];
  onImagesChange: (images: LabelImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
}
```

**Key Features**:
- Drag-and-drop file upload
- Multiple image format support (PNG, JPEG, WEBP)
- Label type assignment (front, back, neck, side, other)
- Image preview with metadata editing
- File size validation (10MB limit)
- Base64 conversion for API transmission

**Image Processing**:
- Automatic file validation
- Base64 encoding
- Preview URL generation
- MIME type detection

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

Component for selecting TTB beverage categories.

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
- Category descriptions and examples
- Visual indicators for selection
- Disabled state during analysis

**Categories**:
- **Distilled Spirits**: Vodka, whiskey, rum, gin, brandy, tequila
- **Wine**: Table wine, sparkling wine, dessert wine, cider, mead
- **Malt Beverages**: Beer, ale, lager, stout, IPA, porter

### AnalysisDisplay.tsx

Complex component for displaying analysis results with structured formatting.

**Props**:
```typescript
interface AnalysisDisplayProps {
  result: string;
  productRequirements: ProductRequirements;
}
```

**Key Features**:
- Parsing of AI analysis text into structured sections
- Color-coded compliance status indicators
- Expandable/collapsible sections
- PDF export functionality
- Copy-to-clipboard for text sharing

**Result Parsing**:
- Extracts compliance status overview
- Structures mandatory information sections
- Identifies compliance notes with status indicators
- Formats observations and recommendations

**Compliance Status Colors**:
- **Green**: Compliant
- **Yellow**: Potential Issue
- **Red**: Non-Compliant
- **Gray**: Not Required

### LoadingSpinner.tsx

Simple loading indicator component.

**Features**:
- Animated spinner with consistent styling
- Accessible loading state indication
- Tailwind CSS styling

**Usage**:
```tsx
<LoadingSpinner />
```

### ImageUploader.tsx (Legacy)

Single image upload component maintained for backward compatibility.

**Props**:
```typescript
interface ImageUploaderProps {
  onImageUpload: (imageData: string, mimeType: string) => void;
  disabled?: boolean;
}
```

### SettingsDropdown.tsx

Settings panel with application configuration options.

**Features**:
- API key status display
- Application version information
- Model information (Gemini 2.5 Flash Preview)
- Download labeling requirements
- Responsive dropdown menu

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

Components include error boundaries and graceful error display:

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

All components use Tailwind CSS for styling:

```tsx
<div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6">
  <h2 className="text-3xl font-bold mb-8 text-sky-600 dark:text-sky-400">
    Title
  </h2>
</div>
```

### Dark Mode Support

Components include dark mode variants:

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
<input
  aria-label="Upload label image"
  aria-describedby="upload-help"
/>
```

### Focus Management

Components manage focus appropriately:

```tsx
<input
  ref={inputRef}
  onFocus={() => setFocused(true)}
  onBlur={() => setFocused(false)}
/>
```

## Performance Considerations

### Memoization

Components use React.memo for performance:

```typescript
const MemoizedComponent = React.memo(({
  prop1,
  prop2
}: ComponentProps) => {
  // Component implementation
});
```

### Callback Optimization

Event handlers use useCallback:

```typescript
const handleImageChange = useCallback((newImages: LabelImage[]) => {
  setLabelImages(newImages);
  setError(null);
}, []);
```

### Effect Dependencies

useEffect hooks have proper dependencies:

```typescript
useEffect(() => {
  if (!process.env.API_KEY) {
    setApiKeyMissing(true);
  }
}, []); // Empty dependency array for mount-only effect
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
4. **Effect Cleanup**: Clean up effects and subscriptions

### Performance

1. **Memo Components**: Use React.memo for expensive components
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
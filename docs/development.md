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

**Recommended VS Code Extensions**:
- ES7+ React/Redux/React-Native snippets
- TypeScript Hero
- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- Auto Rename Tag
- Bracket Pair Colorizer

### Initial Setup

1. **Clone the repository**:
```bash
git clone <repository-url>
cd alcohol-label-compliance-analyzer
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env.local
# Edit .env.local with your API keys
```

4. **Start development server**:
```bash
npm run dev
```

## Project Structure Deep Dive

```
src/
├── components/           # React components
│   ├── Header.tsx       # App header with status
│   ├── Footer.tsx       # App footer
│   ├── MultiImageUploader.tsx    # Multi-image upload system
│   ├── BeverageCategorySelector.tsx  # Category selection
│   ├── AnalysisDisplay.tsx       # Results display
│   ├── LoadingSpinner.tsx        # Loading indicator
│   ├── ImageUploader.tsx         # Legacy single upload
│   └── SettingsDropdown.tsx      # Settings panel
├── services/            # External service integration
│   ├── geminiService.ts # Google Gemini AI integration
│   └── pdfService.ts    # PDF report generation
├── types.ts            # TypeScript type definitions
├── constants.ts        # App constants and AI prompts
├── App.tsx            # Main application component
├── index.tsx          # React app entry point
└── index.html         # HTML template

docs/                   # Documentation
public/                # Static assets
├── aardwolf-*.png     # Logo assets
└── favicon.ico        # App icon

Configuration files:
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── vite.config.ts     # Vite build configuration
├── .gitignore         # Git ignore rules
└── README.md          # Basic project info
```

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

**ESLint Configuration**:
```bash
# Run linting
npm run lint

# Fix auto-fixable issues
npm run lint:fix
```

**Prettier Configuration**:
```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

**TypeScript Checking**:
```bash
# Type checking without build
npx tsc --noEmit
```

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

**Adding New Types**:
```typescript
// In types.ts
export interface NewFeatureType {
  id: string;
  name: string;
  configuration: FeatureConfig;
}

export type ExtendedBeverageCategory = BeverageCategory | 'new-category';
```

**Updating Existing Types**:
```typescript
// Extend existing interfaces
export interface ExtendedProductRequirements extends ProductRequirements {
  newRequirement: boolean;
}
```

### Adding New Beverage Categories

1. **Update Types**:
```typescript
// In types.ts
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

2. **Add Prompts**:
```typescript
// In constants.ts
const NEW_CATEGORY_REQUIREMENTS = `
8. **New Category Specific Requirement:**
    *   Presence & Legibility: (Description)
    *   Statement (as shown): (Quote requirements)
    *   TTB Compliance Notes: (Status and explanation)
`;

// Update prompt function
export const getCategorySpecificPrompt = (category: BeverageCategory): string => {
  let categoryRequirements = '';
  
  switch (category) {
    case 'new-category':
      categoryRequirements = NEW_CATEGORY_REQUIREMENTS;
      break;
    // ... existing cases
  }
  
  return BASE_PROMPT + categoryRequirements + CLOSING_SECTIONS;
};
```

### API Service Extensions

**Adding New API Endpoints**:
```typescript
// In geminiService.ts or new service file
export const newAnalysisFunction = async (
  data: InputType
): Promise<OutputType> => {
  try {
    // API call implementation
    const response = await apiCall(data);
    return processResponse(response);
  } catch (error) {
    console.error('API call failed:', error);
    throw new Error(`Operation failed: ${error.message}`);
  }
};
```

**Error Handling Patterns**:
```typescript
// Consistent error handling
try {
  const result = await apiOperation();
  return result;
} catch (error: any) {
  console.error('Operation failed:', error);
  
  // Specific error types
  if (error.message?.includes('API key')) {
    throw new Error('API key configuration error');
  }
  if (error.message?.includes('quota')) {
    throw new Error('API quota exceeded');
  }
  
  // Generic fallback
  throw new Error(`Operation failed: ${error.message || 'Unknown error'}`);
}
```

## Testing

### Test Structure

**Component Tests**:
```typescript
// ComponentName.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { ComponentName } from './ComponentName';

describe('ComponentName', () => {
  const defaultProps = {
    prop1: 'test-value',
    onAction: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders correctly', () => {
    render(<ComponentName {...defaultProps} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  test('handles user interactions', () => {
    render(<ComponentName {...defaultProps} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(defaultProps.onAction).toHaveBeenCalled();
  });

  test('handles edge cases', () => {
    const edgeProps = { ...defaultProps, prop1: undefined };
    render(<ComponentName {...edgeProps} />);
    // Test behavior with undefined props
  });
});
```

**Service Tests**:
```typescript
// geminiService.test.ts
import { analyzeMultipleLabelsViaService } from './geminiService';

// Mock external dependencies
jest.mock('@google/genai');

describe('geminiService', () => {
  test('handles successful analysis', async () => {
    // Mock setup
    const mockResponse = { text: 'Mock analysis result' };
    
    const result = await analyzeMultipleLabelsViaService(
      mockImages,
      'distilled-spirits',
      mockRequirements
    );
    
    expect(result).toBe('Mock analysis result');
  });

  test('handles API errors', async () => {
    // Mock error scenario
    await expect(
      analyzeMultipleLabelsViaService([], 'wine')
    ).rejects.toThrow('No images provided');
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test ComponentName.test.tsx

# Run tests in watch mode
npm test -- --watch
```

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

// Type assertions for debugging
const debugData = data as any;
console.log('Raw data:', debugData);
```

**Network Debugging**:
```typescript
// Log API requests
console.log('API Request:', {
  url: endpoint,
  data: requestData,
  timestamp: new Date().toISOString()
});
```

### Common Issues

**Build Errors**:
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf .vite
npm run dev
```

**TypeScript Errors**:
```bash
# Check types without building
npx tsc --noEmit

# Update type definitions
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

# Check for large dependencies
npm run build -- --analyze
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

### Memory Management

```typescript
// Cleanup in useEffect
useEffect(() => {
  const subscription = subscribe();
  
  return () => {
    subscription.unsubscribe();
  };
}, []);

// Cleanup object URLs
useEffect(() => {
  return () => {
    images.forEach(image => {
      if (image.previewUrl) {
        URL.revokeObjectURL(image.previewUrl);
      }
    });
  };
}, [images]);
```

## Deployment

### Build Process

```bash
# Production build
npm run build

# Preview build locally
npm run preview

# Test production build
npm run build && npm run preview
```

### Environment-Specific Builds

```bash
# Development build
VITE_ENV=development npm run build

# Staging build
VITE_ENV=staging npm run build

# Production build
VITE_ENV=production npm run build
```

### Continuous Integration

**GitHub Actions Example**:
```yaml
name: CI/CD Pipeline
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
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
- Add tests for new features
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

**Testing**:
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] No regression issues

**Documentation**:
- [ ] Code comments added
- [ ] API documentation updated
- [ ] User guide updated if needed
- [ ] README changes if applicable

This development guide provides comprehensive information for contributing to and extending the Alcohol Label Compliance Analyzer application.
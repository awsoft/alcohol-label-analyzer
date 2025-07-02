// This file is for global TypeScript types and interfaces.

export interface PlaceholderType {
  // Example type, not currently used in the application.
  id: string;
  name: string;
}

// ---- Types for Multiple Image Upload ----

export type LabelType = 'front' | 'back' | 'neck' | 'side' | 'other';

export interface LabelImage {
  id: string;
  file: File;
  labelType: LabelType;
  base64: string;
  mimeType: string;
  previewUrl: string;
  description?: string;
}

export interface LabelTypeInfo {
  id: LabelType;
  name: string;
  description: string;
}

export const LABEL_TYPES: LabelTypeInfo[] = [
  {
    id: 'front',
    name: 'Front Label',
    description: 'Main product label (front)'
  },
  {
    id: 'back',
    name: 'Back Label',
    description: 'Back label with ingredients/details'
  },
  {
    id: 'neck',
    name: 'Neck Label',
    description: 'Neck or collar label'
  },
  {
    id: 'side',
    name: 'Side Label',
    description: 'Side panel or additional label'
  },
  {
    id: 'other',
    name: 'Other Label',
    description: 'Additional stickers or medallions'
  }
];

// ---- Types for structured Analysis Report ----

export const KNOWN_SECTION_KEYS = {
  OVERVIEW: "overview",
  MANDATORY: "mandatory_info",
  OBSERVATIONS: "observations",
  SUMMARY: "summary"
} as const;

export type SectionKey = typeof KNOWN_SECTION_KEYS[keyof typeof KNOWN_SECTION_KEYS];

export interface ReportDetail {
  label: string; 
  value: string; 
  isComplianceNote?: boolean; 
}

export interface ReportItem {
  id: string; 
  title: string; 
  fullItemTitle: string; 
  details: ReportDetail[];
}

export interface ObservationSubSection {
    title: string; 
    points: string[]; 
}

export interface ReportSectionData {
  id: string; 
  title: string; 
  key: SectionKey; 
  items?: ReportItem[]; 
  observationSubSections?: ObservationSubSection[]; 
  freeTextContent?: string[];
}

// ---- Types for Compliance Overview Bar ----
export type ComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Unknown';

export interface ReportOverviewData {
  status: ComplianceStatus;
  statusText: string; // The raw text from "Overall Compliance Status:"
  keyIssues: string[]; // List of key issues
}

export interface ParsedAnalysis {
  overview: ReportOverviewData | null;
  sections: ReportSectionData[];
}

// Interface for product requirements
export interface ProductRequirements {
  includesSulfites: boolean;
  includesYellowNumberFive: boolean;
  includesAspartame: boolean;
}

export type BeverageCategory = 'distilled-spirits' | 'wine' | 'malt-beverages';

export interface BeverageCategoryInfo {
  id: BeverageCategory;
  name: string;
  description: string;
  examples: string[];
}

export const BEVERAGE_CATEGORIES: BeverageCategoryInfo[] = [
  {
    id: 'distilled-spirits',
    name: 'Distilled Spirits',
    description: 'Vodka, whiskey, rum, gin, brandy, and other distilled alcoholic beverages',
    examples: ['Vodka', 'Whiskey', 'Rum', 'Gin', 'Brandy', 'Tequila']
  },
  {
    id: 'wine',
    name: 'Wine',
    description: 'Wine, cider, mead, and other fermented grape or fruit beverages',
    examples: ['Table Wine', 'Sparkling Wine', 'Dessert Wine', 'Cider', 'Mead']
  },
  {
    id: 'malt-beverages',
    name: 'Malt Beverages',
    description: 'Beer, ale, lager, and other malt-based alcoholic beverages',
    examples: ['Beer', 'Ale', 'Lager', 'Stout', 'IPA', 'Porter']
  }
];

// Category-specific requirements
export interface CategorySpecificRequirements {
  distilledSpirits: {
    hasColoringMaterials: boolean;
    hasWoodTreatment: boolean;
    includesFDCYellow5: boolean;
    includesSaccharin: boolean;
    includesSulfites: boolean;
    needsAgeStatement: boolean;
    needsCommodityStatement: boolean;
    needsStateOfDistillation: boolean;
  };
  wine: {
    includesFDCYellow5: boolean;
    includesCochinealCarmine: boolean;
    includesSulfites: boolean;
    hasForeignWinePercentage: boolean;
  };
  maltBeverages: {
    // Malt beverages have fewer specific requirements
    // Most requirements are covered by common mandatory items
  };
}

// ---- Types for Label Comparison Feature ----

export type TTBSubmissionRequirement = 'required' | 'not-required' | 'recommended' | 'uncertain';

export interface LabelComparison {
  oldImages: LabelImage[];
  newImages: LabelImage[];
  beverageCategory: BeverageCategory;
  productRequirements: ProductRequirements;
}

export interface ComparisonChange {
  category: string;
  field: string;
  oldValue: string;
  newValue: string;
  significance: 'major' | 'minor' | 'cosmetic';
  ttbRelevance: 'high' | 'medium' | 'low';
  description: string;
}

export interface TTBSubmissionAnalysis {
  submissionRequired: TTBSubmissionRequirement;
  reasoning: string;
  criticalChanges: ComparisonChange[];
  minorChanges: ComparisonChange[];
  cosmeticChanges: ComparisonChange[];
  recommendations: string[];
  riskLevel: 'high' | 'medium' | 'low';
}

export interface LabelComparisonResult {
  analysisText: string;
  submissionAnalysis: TTBSubmissionAnalysis;
  detectedChanges: ComparisonChange[];
  summary: {
    totalChanges: number;
    criticalChanges: number;
    minorChanges: number;
    cosmeticChanges: number;
  };
}

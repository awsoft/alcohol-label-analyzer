// This file is for global TypeScript types and interfaces.
// Analysis request/report types live in shared/analysisTypes.ts.

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

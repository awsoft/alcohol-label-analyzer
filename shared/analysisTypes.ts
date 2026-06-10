// Request/response contracts shared by the browser client and the Vercel
// serverless functions. Keep this file free of browser- and Node-only APIs.

import type { BeverageCategory, LabelType, ProductRequirements } from '../types';

// ---- Requests ----

export interface AnalysisImage {
  base64: string;
  mimeType: string;
  labelType: LabelType;
}

export interface ComparisonImage {
  base64: string;
  mimeType: string;
}

export interface AnalyzeRequest {
  images: AnalysisImage[];
  beverageCategory: BeverageCategory;
  productRequirements: ProductRequirements;
}

export interface CompareRequest {
  currentImages: ComparisonImage[];
  proposedImages: ComparisonImage[];
  beverageCategory: BeverageCategory;
}

// ---- New-label analysis report ----

export type ItemComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'POTENTIAL_ISSUE' | 'NOT_REQUIRED';

export type OverallComplianceStatus = 'Compliant' | 'Partially Compliant' | 'Non-Compliant' | 'Unable to Determine';

export interface AnalysisReportItem {
  /** Exact item name from the mandatory checklist, e.g. "Brand Name" */
  title: string;
  /** What the label actually shows for this item (quoted), or a statement that it is missing */
  finding: string;
  status: ItemComplianceStatus;
  /** Explanation grounded in TTB rules */
  notes: string;
}

export interface AnalysisObservation {
  title: string;
  points: string[];
}

export interface AnalysisReport {
  overallStatus: OverallComplianceStatus;
  keyIssues: string[];
  summary: string;
  mandatoryItems: AnalysisReportItem[];
  observations: AnalysisObservation[];
}

// ---- Application verification (label vs. COLA application data) ----

/** The values the applicant filed — what the label must be checked against. */
export interface ApplicationData {
  brandName: string;
  classType: string;
  alcoholContent: string;
  netContents: string;
  bottlerName?: string;
  countryOfOrigin?: string;
}

export interface VerifyRequest {
  images: ComparisonImage[];
  application: ApplicationData;
  beverageCategory: BeverageCategory;
}

export type FieldMatchStatus = 'MATCH' | 'MISMATCH' | 'NOT_FOUND' | 'NEEDS_REVIEW';

export interface FieldVerification {
  /** Application field name, e.g. "Brand Name" */
  field: string;
  applicationValue: string;
  /** Exact text found on the label, or "not found" */
  labelValue: string;
  status: FieldMatchStatus;
  /** One-line judgment explanation */
  note: string;
}

export interface WarningVerification {
  present: boolean;
  exactWording: boolean;
  formattingCorrect: boolean;
  status: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  note: string;
}

export interface VerificationReport {
  /** Derived deterministically from fields + warning (not model-generated) */
  overallResult: 'PASS' | 'FAIL' | 'NEEDS_REVIEW';
  fields: FieldVerification[];
  warningStatement: WarningVerification;
  /** Empty string when image quality is fine */
  imageQualityNote: string;
}

/** PASS only when everything matches; FAIL on any hard mismatch; NEEDS_REVIEW otherwise. */
export const deriveOverallResult = (
  fields: FieldVerification[],
  warning: WarningVerification
): VerificationReport['overallResult'] => {
  if (fields.some(f => f.status === 'MISMATCH' || f.status === 'NOT_FOUND') || warning.status === 'FAIL') {
    return 'FAIL';
  }
  if (fields.every(f => f.status === 'MATCH') && warning.status === 'PASS') {
    return 'PASS';
  }
  return 'NEEDS_REVIEW';
};

// ---- Label-change comparison report ----

export type ChangeSignificance = 'critical' | 'minor' | 'cosmetic';

export type SubmissionRequirement = 'required' | 'recommended' | 'not-required' | 'uncertain';

export interface ComparisonChange {
  /** Label element that changed, e.g. "Net Contents", "Brand Name" */
  category: string;
  significance: ChangeSignificance;
  /** Exact text/description on the current label, or "not present" */
  currentValue: string;
  /** Exact text/description on the proposed label, or "not present" */
  proposedValue: string;
  /** Human-readable area description, e.g. "bottom-left of the front label" */
  location: string;
  /** Why this change matters (or doesn't) for TTB submission */
  impact: string;
}

export interface ComparisonReport {
  /** True when no differences could be verified between the two versions */
  identical: boolean;
  submissionRequired: SubmissionRequirement;
  riskLevel: 'high' | 'medium' | 'low';
  reasoning: string;
  changes: ComparisonChange[];
  recommendations: string[];
  finalDetermination: string;
}

// ---- Helpers shared by UI and PDF export ----

export interface ComplianceScore {
  compliant: number;
  total: number;
  percentage: number;
}

/** Items marked NOT_REQUIRED are excluded from scoring entirely. */
export const calculateComplianceScore = (report: AnalysisReport): ComplianceScore => {
  const scored = report.mandatoryItems.filter(item => item.status !== 'NOT_REQUIRED');
  const compliant = scored.filter(item => item.status === 'COMPLIANT').length;
  const total = scored.length;
  return {
    compliant,
    total,
    percentage: total > 0 ? Math.round((compliant / total) * 100) : 0,
  };
};

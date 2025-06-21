
// This file is for global TypeScript types and interfaces.

export interface PlaceholderType {
  // Example type, not currently used in the application.
  id: string;
  name: string;
}

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

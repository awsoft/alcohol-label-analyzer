// Prompt construction and Gemini calls for both analysis modes.
// Isomorphic: used directly by the browser (when the user supplies their own
// API key) and by the Vercel serverless functions (server-side key).

import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type { BeverageCategory } from '../types';
import type {
  AnalyzeRequest,
  CompareRequest,
  AnalysisReport,
  ComparisonReport,
} from './analysisTypes';

export const GEMINI_MODEL = 'gemini-3.5-flash';

// ---- Prompts: new-label analysis ----

const LABEL_TYPE_CONTEXT: Record<string, string> = {
  front: 'Main product label with brand name, product type, alcohol content',
  back: 'Back label with ingredients, allergen warnings, producer information',
  neck: 'Neck or collar label with additional branding or age statements',
  side: 'Side panel or additional label information',
  other: 'Additional stickers, medallions, or supplementary label information',
};

const BASE_MANDATORY_ITEMS = `
1. "Brand Name" — Is it clearly visible, legible, and does it meet TTB requirements for prominence and clarity? Quote the brand name as shown.
2. "Class and Type Designation" — e.g. "Straight Bourbon Whiskey", "Vodka", "India Pale Ale", "Table Wine". Is it a TTB-approved designation for the product, with adequate font size and conspicuousness? Quote it as shown.
3. "Alcohol Content (ABV)" — Quote the statement as shown (e.g. "X% ALC. BY VOL."). Is the formatting correct per TTB rules?
4. "Net Contents" — Quote as shown (e.g. "750 mL", "12 FL OZ"). Are the units correct for the product type and do placement/size meet TTB requirements?
5. "Name and Address of Bottler/Packer or Importer" — Quote the statement type (e.g. "Bottled by", "Imported by"), company name, and city/state. Does the phrasing meet TTB requirements?
6. "Government Health Warning Statement" — Must read exactly: "GOVERNMENT WARNING:" in bold capitals, followed by "(1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems." Is it present, legible, conspicuous, and worded correctly?
7. "Country of Origin" — Mandatory for imported products only (e.g. "PRODUCT OF FRANCE"). Use status NOT_REQUIRED for domestic products.`;

const CATEGORY_ITEMS: Record<BeverageCategory, string> = {
  'distilled-spirits': `
8. "Coloring Materials Disclosure" — e.g. "COLORED WITH CARAMEL". Required if coloring materials are used.
9. "Treatment with Wood" — Disclosure required for whisky/brandy treated with wood other than oak containers.
10. "FD&C Yellow No. 5 Declaration" — e.g. "CONTAINS FD&C YELLOW #5". Required if the colorant is used.
11. "Saccharin Declaration" — Warning statement required if saccharin is used.
12. "Sulfite Declaration" — e.g. "CONTAINS SULFITES". Required at 10 ppm or more.
13. "Commodity Statement" — e.g. "% NEUTRAL SPIRITS DISTILLED FROM [SOURCE]", where applicable.
14. "Statement of Age" — Required for whisky under 4 years and grape brandy under 2 years.
15. "State of Distillation" — Required for certain U.S. whiskies.`,
  wine: `
8. "FD&C Yellow No. 5 Declaration" — e.g. "CONTAINS FD&C YELLOW NO. 5". Required if the colorant is used.
9. "Cochineal Extract/Carmine Declaration" — e.g. "CONTAINS COCHINEAL EXTRACT". Required if these colorants are used.
10. "Sulfite Declaration" — e.g. "CONTAINS SULFITES". Required for wine containing 10 ppm or more.
11. "Percentage of Foreign Wine" — Required where foreign wine content is referenced.`,
  'malt-beverages': `
(Malt beverages have no additional category-specific mandatory items beyond the common elements above. If everything above is covered, do not invent extra items.)`,
};

const buildRequirementsDirectives = (req: AnalyzeRequest): string => {
  const { includesSulfites, includesYellowNumberFive, includesAspartame } = req.productRequirements;
  const directive = (contains: boolean, itemName: string, statement: string) =>
    contains
      ? `- The product CONTAINS ${statement}. Look across ALL images for the required ${itemName}. If it is missing from every image, set that item's status to NON_COMPLIANT.`
      : `- The product does NOT contain ${statement}. Set the ${itemName} item's status to NOT_REQUIRED and do not flag it as an issue.`;

  return `
PRODUCT FACTS PROVIDED BY THE USER (treat these as authoritative):
${directive(includesSulfites, 'Sulfite Declaration', 'sulfites (10 ppm or more)')}
${directive(includesYellowNumberFive, 'FD&C Yellow No. 5 Declaration', 'FD&C Yellow No. 5')}
${includesAspartame
    ? '- The product CONTAINS aspartame. Include an additional mandatory item titled "Aspartame Declaration" and verify the required phenylketonurics warning ("PHENYLKETONURICS: CONTAINS PHENYLALANINE"). If missing from every image, set its status to NON_COMPLIANT.'
    : '- The product does NOT contain aspartame. Do not evaluate or report an aspartame declaration item.'}`;
};

export const buildAnalysisPrompt = (req: AnalyzeRequest): string => {
  const imageContext = req.images
    .map((image, index) => `Image ${index + 1}: ${image.labelType.toUpperCase()} LABEL — ${LABEL_TYPE_CONTEXT[image.labelType] ?? LABEL_TYPE_CONTEXT.other}`)
    .join('\n');

  return `You are an expert in U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB) alcohol beverage labeling regulations. Analyze the provided label image(s) strictly against TTB requirements.

BEVERAGE CATEGORY: ${req.beverageCategory.toUpperCase().replace('-', ' ')}

You are looking at ${req.images.length} image(s) of the labeling for a SINGLE product:
${imageContext}

Treat all images collectively — required information may be split across them (e.g. brand name on the front, allergen statements on the back). Mark an element as missing only if it does not appear on ANY of the provided images.
${buildRequirementsDirectives(req)}

EVALUATE EACH OF THESE MANDATORY ITEMS (use the quoted names verbatim as the item titles in your response):
${BASE_MANDATORY_ITEMS}
${CATEGORY_ITEMS[req.beverageCategory]}

For every item report:
- "finding": exactly what the label shows for this item (quote the text), or a clear statement that it is missing or illegible.
- "status": COMPLIANT (fully meets TTB requirements), NON_COMPLIANT (clearly violates requirements or is missing when required), POTENTIAL_ISSUE (unclear, partially visible, or needs TTB evaluation), or NOT_REQUIRED (not applicable to this product).
- "notes": a concise explanation grounded in TTB rules.

Also report:
- "overallStatus": Compliant, Partially Compliant, Non-Compliant, or Unable to Determine.
- "keyIssues": up to 3 of the most critical problems (empty array if none).
- "observations": grouped additional findings with these group titles where relevant: "Missing Mandatory Information", "Prohibited Practices/Statements" (misleading statements, health claims, competitor disparagement, improper flags/seals, class/type confusion), "Legibility & Conspicuousness" (font sizes, contrast, placement of required information), and "General Comments".
- "summary": a brief concluding paragraph on the label's TTB compliance strengths and weaknesses.

Base every statement strictly on what is visible in the images. If something is unclear or illegible, say so and use POTENTIAL_ISSUE — do not guess.`;
};

// ---- Prompts: label-change comparison ----

export const buildComparisonPrompt = (req: CompareRequest): string => {
  const n = req.currentImages.length;
  const m = req.proposedImages.length;

  return `You are an expert in U.S. TTB alcohol beverage labeling regulations. Compare the CURRENT (approved) label against the PROPOSED (revised) label for a ${req.beverageCategory.replace('-', ' ')} product and determine whether the changes require a new TTB certificate of label approval (COLA) submission.

The first ${n} image(s) show the CURRENT label. The remaining ${m} image(s) show the PROPOSED label.

IMPORTANT — the two versions may be identical, nearly identical, or substantially different. Report only differences you can actually verify by comparing the images. Never assume differences exist, and never invent changes. If you find no real differences, set "identical" to true, return an empty "changes" array, and set "submissionRequired" to "not-required".

Systematically compare every label element:
1. Brand name
2. Class/type designation
3. Alcohol content (ABV) statement
4. Net contents / volume statement
5. Government health warning text
6. Bottler/producer/importer name and address
7. Country of origin
8. Age statements and other regulated claims
9. Ingredient, allergen, sulfite, and colorant declarations
10. All other visible text, including fine print
11. Graphics, colors, fonts, and layout

Classify each verified difference:
- "critical" — TTB submission REQUIRED: changes to brand name, class/type designation, alcohol content, net contents, mandatory statements, health warning text, producer/importer information, or TTB-regulated claims.
- "minor" — TTB submission RECOMMENDED/may be required: changes to ingredient lists, allergen statements, or optional statements that could affect compliance.
- "cosmetic" — no TTB submission required: colors, fonts, graphics, or layout changes that do not affect mandatory information.

For each change report the element ("category"), the exact text on each version ("currentValue"/"proposedValue", using "not present" when an element exists on only one version), a short human-readable area description ("location", e.g. "bottom-left of the label"), and why it does or does not matter for TTB submission ("impact").

Differences in photo quality, lighting, scan resolution, perspective, or compression artifacts are NOT label changes — ignore them.

Finally report: "submissionRequired" (required / recommended / not-required / uncertain), "riskLevel" (high / medium / low), "reasoning" (the primary basis for the determination), "recommendations" (practical next steps, empty array if none), and "finalDetermination" (one clear closing statement).`;
};

// ---- Gemini response schemas ----

const ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    overallStatus: {
      type: Type.STRING,
      enum: ['Compliant', 'Partially Compliant', 'Non-Compliant', 'Unable to Determine'],
    },
    keyIssues: { type: Type.ARRAY, items: { type: Type.STRING } },
    summary: { type: Type.STRING },
    mandatoryItems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          finding: { type: Type.STRING },
          status: {
            type: Type.STRING,
            enum: ['COMPLIANT', 'NON_COMPLIANT', 'POTENTIAL_ISSUE', 'NOT_REQUIRED'],
          },
          notes: { type: Type.STRING },
        },
        required: ['title', 'finding', 'status', 'notes'],
        propertyOrdering: ['title', 'finding', 'status', 'notes'],
      },
    },
    observations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          points: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
        required: ['title', 'points'],
        propertyOrdering: ['title', 'points'],
      },
    },
  },
  required: ['overallStatus', 'keyIssues', 'summary', 'mandatoryItems', 'observations'],
  propertyOrdering: ['mandatoryItems', 'observations', 'keyIssues', 'overallStatus', 'summary'],
};

const COMPARISON_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    identical: { type: Type.BOOLEAN },
    submissionRequired: {
      type: Type.STRING,
      enum: ['required', 'recommended', 'not-required', 'uncertain'],
    },
    riskLevel: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
    reasoning: { type: Type.STRING },
    changes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: { type: Type.STRING },
          significance: { type: Type.STRING, enum: ['critical', 'minor', 'cosmetic'] },
          currentValue: { type: Type.STRING },
          proposedValue: { type: Type.STRING },
          location: { type: Type.STRING },
          impact: { type: Type.STRING },
        },
        required: ['category', 'significance', 'currentValue', 'proposedValue', 'location', 'impact'],
        propertyOrdering: ['category', 'significance', 'currentValue', 'proposedValue', 'location', 'impact'],
      },
    },
    recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
    finalDetermination: { type: Type.STRING },
  },
  required: ['identical', 'submissionRequired', 'riskLevel', 'reasoning', 'changes', 'recommendations', 'finalDetermination'],
  propertyOrdering: ['changes', 'identical', 'submissionRequired', 'riskLevel', 'reasoning', 'recommendations', 'finalDetermination'],
};

// ---- Runners ----

/** Maps raw Gemini/SDK errors to user-presentable messages. */
export const translateGeminiError = (error: unknown, action: string): Error => {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('API key not valid') || message.includes('API_KEY_INVALID')) {
    return new Error('The configured Gemini API key is invalid. Please verify the key.');
  }
  if (message.includes('quota') || message.includes('RESOURCE_EXHAUSTED')) {
    return new Error('The Gemini API quota has been exceeded. Please check usage and limits.');
  }
  return new Error(`Failed to ${action}: ${message || 'Unknown API error'}`);
};

const parseReport = <T>(text: string | undefined, action: string): T => {
  if (!text) {
    throw new Error(`Received an empty response from the AI while trying to ${action}. The images might be unclear — please try again.`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`The AI returned a response that could not be parsed while trying to ${action}. Please try again.`);
  }
};

const toInlinePart = (image: { base64: string; mimeType: string }) => ({
  inlineData: { mimeType: image.mimeType, data: image.base64 },
});

export const runLabelAnalysis = async (apiKey: string, request: AnalyzeRequest): Promise<AnalysisReport> => {
  if (request.images.length === 0) {
    throw new Error('No images provided for analysis.');
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [...request.images.map(toInlinePart), { text: buildAnalysisPrompt(request) }] },
      config: { responseMimeType: 'application/json', responseSchema: ANALYSIS_SCHEMA },
    });
    return parseReport<AnalysisReport>(response.text, 'analyze the labels');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Received an empty response')) throw error;
    if (error instanceof Error && error.message.startsWith('The AI returned')) throw error;
    throw translateGeminiError(error, 'analyze the labels');
  }
};

export const runLabelComparison = async (apiKey: string, request: CompareRequest): Promise<ComparisonReport> => {
  if (request.currentImages.length === 0 || request.proposedImages.length === 0) {
    throw new Error('Both current and proposed images are required for comparison.');
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          ...request.currentImages.map(toInlinePart),
          ...request.proposedImages.map(toInlinePart),
          { text: buildComparisonPrompt(request) },
        ],
      },
      config: { responseMimeType: 'application/json', responseSchema: COMPARISON_SCHEMA },
    });
    return parseReport<ComparisonReport>(response.text, 'compare the labels');
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Received an empty response')) throw error;
    if (error instanceof Error && error.message.startsWith('The AI returned')) throw error;
    throw translateGeminiError(error, 'compare the labels');
  }
};

/** Minimal end-to-end connectivity check; costs one tiny Gemini call. */
export const testGeminiConnection = async (apiKey: string): Promise<boolean> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: { parts: [{ text: 'Reply with the single word: ok' }] },
    });
    return !!response.text;
  } catch {
    return false;
  }
};

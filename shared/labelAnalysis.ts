// Prompt construction and Gemini calls for both analysis modes.
// Isomorphic: used directly by the browser (when the user supplies their own
// API key) and by the Vercel serverless functions (server-side key).

import { GoogleGenAI, Type } from '@google/genai';
import type { Schema } from '@google/genai';
import type { BeverageCategory } from '../types';
import type {
  AnalyzeRequest,
  CompareRequest,
  VerifyRequest,
  AnalysisReport,
  ComparisonReport,
  VerificationReport,
} from './analysisTypes.js';
import { deriveOverallResult } from './analysisTypes.js';

export const GEMINI_MODEL = 'gemini-3.5-flash';
// Verification is latency-critical (agents abandon tools slower than ~5s), so it
// uses the lite model — benchmarked faster with equivalent matching quality.
export const GEMINI_VERIFY_MODEL = 'gemini-3.1-flash-lite';

export const GOVERNMENT_WARNING_TEXT =
  'GOVERNMENT WARNING: (1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems.';

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
6. "Government Health Warning Statement" — Must read exactly: "GOVERNMENT WARNING:" in bold capitals (the remainder must NOT be bold), followed by "(1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems." Per 27 CFR 16.21 it may appear on the front, back, or side label, separate and apart from other information. Is it present on any provided image, legible, conspicuous, and worded correctly?
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

// ---- Prompts: application verification ----

/**
 * Placement rules per 27 CFR:
 * - Spirits (5.63) & malt (7.63), as modernized by T.D. TTB-176: brand name,
 *   class/type, and alcohol content must share ONE field of vision (a single
 *   side of the container); all other items may appear on any label.
 * - Wine (4.32): brand name and class/type must be on the brand (front)
 *   label; name/address, net contents, and alcohol content may be on any label.
 * - Health warning (16.21): may be on the front, back, or side label.
 */
const buildPlacementRules = (req: VerifyRequest): string => {
  const labelType = req.labelType ?? 'front';
  const isWine = req.beverageCategory === 'wine';

  if (labelType === 'front') {
    if (isWine) {
      return `THIS IMAGE IS THE FRONT (BRAND) LABEL of a wine container. Placement rules (27 CFR 4.32):
- Brand Name and Class/Type are REQUIRED on this label. If absent, use NOT_FOUND.
- Alcohol Content, Net Contents, Bottler Name/Address, and Country of Origin may legally appear on a different label. If one is absent here, use NOT_EXPECTED and note that it may appear on another label; if present, judge it normally.`;
    }
    return `THIS IMAGE IS THE FRONT LABEL. Placement rules (27 CFR 5.63 / 7.63): Brand Name, Class/Type, and Alcohol Content must appear together in one field of vision (a single side of the container), and the front label is normally that side.
- If ANY of Brand Name, Class/Type, or Alcohol Content appears on this label, ALL THREE are expected here — use NOT_FOUND for a missing one and note that the trio must share a single field of vision.
- Net Contents, Bottler Name/Address, and Country of Origin may legally appear on a different label. If absent here, use NOT_EXPECTED with a note; if present, judge normally.`;
  }

  return `THIS IMAGE IS THE ${labelType.toUpperCase()} LABEL — not the principal display. TTB placement rules allow most mandatory information to be on a different label (brand name/class/type${isWine ? '' : '/alcohol content'} belong ${isWine ? 'on the brand label' : 'together in one field of vision, normally the front'}).
- For every application field that is absent from THIS label, use NOT_EXPECTED with a note that it should appear on the ${isWine ? 'brand label' : 'front of the container'} — that is not a problem with this label.
- For any application field that IS visible on this label, judge it normally: information that contradicts the application is a MISMATCH wherever it appears.`;
};

export const buildVerificationPrompt = (req: VerifyRequest): string => {
  const app = req.application;
  const optionalLines = [
    app.bottlerName ? `- Bottler/Producer Name and Address: "${app.bottlerName}"` : null,
    app.countryOfOrigin ? `- Country of Origin: "${app.countryOfOrigin}"` : null,
  ].filter(Boolean).join('\n');

  return `You are assisting a TTB compliance agent. Verify that the label image matches the application data the applicant filed. Be fast and precise.

APPLICATION DATA:
- Brand Name: "${app.brandName}"
- Class/Type: "${app.classType}"
- Alcohol Content: "${app.alcoholContent}"
- Net Contents: "${app.netContents}"
${optionalLines}
Beverage category: ${req.beverageCategory.replace('-', ' ')}

${buildPlacementRules(req)}

For EACH application field above, find the corresponding text on the label and judge:
- MATCH — same information. Apply human judgment: differences in capitalization, punctuation, or spacing are still a MATCH (mention the difference in the note). Equivalent expressions match: "45% Alc./Vol." = "45% ALC/VOL" = "90 Proof" (proof is exactly 2x ABV); "750 mL" = "750ML" = "75 cl".
- MISMATCH — substantively different (different name, different number, different designation), wherever it appears.
- NOT_FOUND — absent from this label even though it is required on this label type (see placement rules above).
- NOT_EXPECTED — absent from this label, but permitted to appear on a different label per the placement rules above.
- NEEDS_REVIEW — visible but too unclear or ambiguous to judge confidently.
Report labelValue as the exact text shown on the label, or "not found".

Also verify the Government Health Warning Statement. Per 27 CFR 16.21 it may appear on the front, back, OR side label, separate and apart from all other information:
- present: is the warning statement on THIS label?
- exactWording: does it match this text word-for-word: "${GOVERNMENT_WARNING_TEXT}"
- formattingCorrect: "GOVERNMENT WARNING:" must be in capital letters AND bold type, and the REMAINDER of the statement must NOT be in bold type.
- status: PASS only if present here with exact wording and correct formatting. FAIL if present but reworded or wrongly formatted. If it is simply absent from this label, use NEEDS_REVIEW with a note that the warning may appear on another label of the container and the agent should confirm it there — absence from one label alone is not a violation.

If the photo is blurry, angled, glared, or partially unreadable, describe it briefly in imageQualityNote; use an empty string if quality is fine.

Only evaluate the fields listed in the application data. Do not invent additional fields.`;
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

const VERIFICATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    fields: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING },
          applicationValue: { type: Type.STRING },
          labelValue: { type: Type.STRING },
          status: { type: Type.STRING, enum: ['MATCH', 'MISMATCH', 'NOT_FOUND', 'NOT_EXPECTED', 'NEEDS_REVIEW'] },
          note: { type: Type.STRING },
        },
        required: ['field', 'applicationValue', 'labelValue', 'status', 'note'],
        propertyOrdering: ['field', 'applicationValue', 'labelValue', 'status', 'note'],
      },
    },
    warningStatement: {
      type: Type.OBJECT,
      properties: {
        present: { type: Type.BOOLEAN },
        exactWording: { type: Type.BOOLEAN },
        formattingCorrect: { type: Type.BOOLEAN },
        status: { type: Type.STRING, enum: ['PASS', 'FAIL', 'NEEDS_REVIEW'] },
        note: { type: Type.STRING },
      },
      required: ['present', 'exactWording', 'formattingCorrect', 'status', 'note'],
      propertyOrdering: ['present', 'exactWording', 'formattingCorrect', 'status', 'note'],
    },
    imageQualityNote: { type: Type.STRING },
  },
  required: ['fields', 'warningStatement', 'imageQualityNote'],
  propertyOrdering: ['fields', 'warningStatement', 'imageQualityNote'],
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

export const runLabelVerification = async (
  apiKey: string,
  request: VerifyRequest,
  modelOverride?: string
): Promise<VerificationReport> => {
  if (request.images.length === 0) {
    throw new Error('No label image provided for verification.');
  }
  const { brandName, classType, alcoholContent, netContents } = request.application;
  if (!brandName?.trim() || !classType?.trim() || !alcoholContent?.trim() || !netContents?.trim()) {
    throw new Error('Application data must include brand name, class/type, alcohol content, and net contents.');
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: modelOverride ?? GEMINI_VERIFY_MODEL,
      contents: { parts: [...request.images.map(toInlinePart), { text: buildVerificationPrompt(request) }] },
      config: { responseMimeType: 'application/json', responseSchema: VERIFICATION_SCHEMA },
    });
    const partial = parseReport<Omit<VerificationReport, 'overallResult'>>(response.text, 'verify the label');
    return { ...partial, overallResult: deriveOverallResult(partial.fields, partial.warningStatement) };
  } catch (error) {
    if (error instanceof Error && (error.message.startsWith('Received an empty response') || error.message.startsWith('The AI returned'))) {
      throw error;
    }
    throw translateGeminiError(error, 'verify the label');
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

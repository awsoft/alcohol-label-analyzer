// App version - update this when releasing new versions
export const APP_VERSION = "1.0.0";

import { BeverageCategory } from './types';

// Base prompt that applies to all beverage types
const BASE_PROMPT = `
You are an expert in U.S. Alcohol and Tobacco Tax and Trade Bureau (TTB) alcohol beverage labeling regulations. Analyze the provided alcohol label image STRICTLY based on TTB requirements for the specified beverage category.

Provide a detailed report in a structured, itemized list format. For each item, state whether it appears to be present and compliant, and provide the specific information as seen on the label. If information is not visible, unclear, or potentially non-compliant, clearly state that and explain why.

**IMPORTANT: For each TTB Compliance Notes section, you MUST start with one of these exact compliance status phrases:**
- "COMPLIANT: [explanation]" - if the item fully meets TTB requirements
- "NON-COMPLIANT: [explanation]" - if the item clearly violates TTB requirements or is missing when required
- "POTENTIAL ISSUE: [explanation]" - if the item may need TTB evaluation or has unclear compliance
- "NOT REQUIRED: [explanation]" - if the item is not applicable to this product type

**Compliance Status Overview:**
*   Overall Compliance Status: (State one: e.g., Compliant, Partially Compliant - Minor Issues, Non-Compliant - Major Issues, Unable to Determine)
*   Key Issues (if any, max 2-3 brief bullet points): (Briefly list the most critical missing items or violations. If none, state "No critical issues identified on visible label.")

**TTB Mandatory Label Information:**

1.  **Brand Name:**
    *   Presence & Legibility: (Is it clearly visible and readable?)
    *   Brand Name (as shown): (Quote the brand name from the label)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if the brand name is present, legible, and meets TTB requirements for prominence and clarity)

2.  **Class and Type Designation:** (e.g., "Straight Bourbon Whiskey", "Vodka", "India Pale Ale", "Grape Wine", "Table Wine")
    *   Presence & Legibility: (Is it present and readable?)
    *   Designation (as shown): (Quote the designation from the label)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if it's a TTB-approved designation for the product and meets requirements for font size and conspicuousness)

3.  **Alcohol Content (Alcohol by Volume - ABV):**
    *   Presence & Legibility: (Is it present and readable?)
    *   Stated ABV (as shown): (Quote the ABV statement, e.g., "X% ALC. BY VOL.", "ALCOHOL X% BY VOLUME")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if the formatting is correct per TTB rules and within allowed tolerance)

4.  **Net Contents:**
    *   Presence & Legibility: (Is it present and readable?)
    *   Net Contents (as shown): (Quote the net contents, e.g., "750 mL", "12 FL OZ")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if units are correct for product type and meet TTB placement/size requirements)

5.  **Name and Address of Bottler/Packer (Domestic) or Importer (Imported):**
    *   Presence & Legibility: (Is this information present and readable?)
    *   Statement Type: (e.g., "Bottled by", "Produced and bottled by", "Imported by")
    *   Name (as shown): (Quote the name of the company)
    *   Address (City & State, as shown): (Quote the city and state)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if phrasing and address information meet TTB requirements)

6.  **Government Health Warning Statement:**
    *   Presence & Legibility: (Is the full statement present and readable?)
    *   Verification of Exact Wording: Does the label contain "GOVERNMENT WARNING:" in bold capital letters, followed by: "(1) According to the Surgeon General, women should not drink alcoholic beverages during pregnancy because of the risk of birth defects. (2) Consumption of alcoholic beverages impairs your ability to drive a car or operate machinery, and may cause health problems."? (Quote if fully visible, otherwise confirm structure and key phrases)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain if it's legible, conspicuous, formatted correctly, and has proper wording)

7.  **Country of Origin (Mandatory for Imported Products):**
    *   Presence & Legibility (if applicable): (Is it present and readable, if the product is imported?)
    *   Stated Country (as shown): (Quote the country of origin statement, e.g., "PRODUCT OF [COUNTRY]")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED: Not required for domestic products" if it's a domestic product)
`;

// Category-specific additional requirements
const DISTILLED_SPIRITS_REQUIREMENTS = `
8.  **Presence of Coloring Materials:**
    *   Presence & Legibility: (Is a coloring disclosure present and readable?)
    *   Statement (as shown): (Quote any coloring statements, e.g., "COLORED WITH CARAMEL")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain coloring material disclosure requirements)

9.  **Treatment with Wood (for Whisky/Brandy):**
    *   Presence & Legibility: (Is wood treatment disclosure present if applicable?)
    *   Statement (as shown): (Quote any wood treatment statements)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain wood treatment disclosure requirements)

10. **Declaration of FD&C Yellow No. 5 (if present in the product):**
    *   Presence & Legibility (if applicable): (Is a declaration for FD&C Yellow No. 5 present and readable, if used?)
    *   Statement (as shown): (Quote the statement, e.g., "CONTAINS FD&C YELLOW #5")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if the colorant is not used in the product)

11. **Declaration of Saccharin (if present in the product):**
    *   Presence & Legibility (if applicable): (Is a saccharin warning present and readable, if used?)
    *   Statement (as shown): (Quote the warning statement)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if saccharin is not used)

12. **Declaration of Sulfites (Required if 10 ppm or more):**
    *   Presence & Legibility (if applicable): (Is a sulfite declaration present and readable, if used?)
    *   Statement (as shown): (Quote the statement, e.g., "CONTAINS SULFITES")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if sulfites are not used)

13. **Commodity Statement (if applicable):**
    *   Presence & Legibility: (Is a commodity statement present if required?)
    *   Statement (as shown): (Quote any commodity statements, e.g., "% NEUTRAL SPIRITS DISTILLED FROM [SOURCE]")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain commodity statement requirements)

14. **Statements of Age (if applicable):**
    *   Presence & Legibility: (Is an age statement present if required?)
    *   Statement (as shown): (Quote any age statements)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain age statement requirements for whisky <4 years, grape brandy <2 years)

15. **State of Distillation (for U.S. Whisky):**
    *   Presence & Legibility: (Is state of distillation shown if required?)
    *   Statement (as shown): (Quote the state information)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain state of distillation requirements)
`;

const WINE_REQUIREMENTS = `
8.  **Declaration of FD&C Yellow No. 5 (if present in the product):**
    *   Presence & Legibility (if applicable): (Is a declaration for FD&C Yellow No. 5 present and readable, if used?)
    *   Statement (as shown): (Quote the statement, e.g., "CONTAINS FD&C YELLOW NO. 5")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if the colorant is not used in the product)

9.  **Declaration of Cochineal Extract/Carmine (if present in the product):**
    *   Presence & Legibility (if applicable): (Is a declaration for cochineal extract or carmine present and readable, if used?)
    *   Statement (as shown): (Quote the statement, e.g., "CONTAINS COCHINEAL EXTRACT" or "CONTAINS CARMINE")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if these colorants are not used)

10. **Declaration of Sulfites (Required for wine containing 10 ppm or more):**
    *   Presence & Legibility (if applicable): (Is a sulfite declaration present and readable, if applicable?)
    *   Statement (as shown): (Quote the statement, e.g., "CONTAINS SULFITES")
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain - use "NOT REQUIRED" if sulfites are below 10 ppm)

11. **Percentage of Foreign Wine (if mentioned):**
    *   Presence & Legibility (if applicable): (Is foreign wine percentage stated if mentioned?)
    *   Statement (as shown): (Quote any foreign wine percentage statements)
    *   TTB Compliance Notes: (Start with COMPLIANT/NON-COMPLIANT/POTENTIAL ISSUE/NOT REQUIRED, then explain foreign wine percentage requirements)
`;

const MALT_BEVERAGES_REQUIREMENTS = `
8.  **Additional Malt Beverage Specific Requirements:**
    *   Note: Malt beverages have fewer additional mandatory disclosure requirements compared to distilled spirits and wine
    *   TTB Compliance Notes: (Start with COMPLIANT, then note that malt beverages primarily require the common mandatory elements listed above)
`;

// Closing sections for all categories
const CLOSING_SECTIONS = `
**Other TTB Compliance Observations:**

*   **Missing Mandatory Information:** Explicitly list any TTB mandatory information (from the items above or others like saccharin or specific commodity treatments if applicable) that appears to be entirely missing.
*   **Prohibited Practices/Statements:** Note any elements that might violate TTB regulations, such as:
    *   Misleading statements or designs.
    *   Therapeutic or health claims (beyond the standard warning).
    *   Disparagement of competitor's products.
    *   Improper use of flags, seals, or insignia.
    *   Statements or representations that could be mistaken for a different class/type of alcohol.
*   **Legibility & Conspicuousness:** Comment on the overall legibility, font sizes (relative assessment if absolute cannot be determined), color contrast, and placement of all TTB-required information. Are they readily apparent and easily readable by the consumer under normal conditions?
*   **General Comments:** Any other observations relevant to TTB labeling compliance (e.g., information on a strip stamp, adherence to type size ratios if discernible).

**Overall TTB Compliance Summary:**
*   Provide a brief concluding summary highlighting the label's apparent TTB compliance strengths and any critical TTB-related weaknesses or areas of concern found.
`;

export const getCategorySpecificPrompt = (category: BeverageCategory): string => {
  let categoryRequirements = '';
  
  switch (category) {
    case 'distilled-spirits':
      categoryRequirements = DISTILLED_SPIRITS_REQUIREMENTS;
      break;
    case 'wine':
      categoryRequirements = WINE_REQUIREMENTS;
      break;
    case 'malt-beverages':
      categoryRequirements = MALT_BEVERAGES_REQUIREMENTS;
      break;
  }
  
  return BASE_PROMPT + categoryRequirements + CLOSING_SECTIONS;
};

// Keep the original prompt for backward compatibility
export const GEMINI_PROMPT = getCategorySpecificPrompt('distilled-spirits');
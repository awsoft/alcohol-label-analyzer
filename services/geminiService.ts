import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { getCategorySpecificPrompt, COMPARISON_PROMPT, APP_VERSION } from '../constants';
import { ProductRequirements, BeverageCategory, LabelImage, LabelComparison } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is missing. Please set the API_KEY environment variable.");
  // No throw here, App.tsx will handle UI notification
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Provide a dummy if missing to avoid constructor error
const model = 'gemini-2.5-flash-preview-04-17';

// Export the model name for use in settings
export const GEMINI_MODEL_NAME = 'Gemini 2.5 Flash Preview';

// Export function to check API key status
export const getApiKeyStatus = (): { isConfigured: boolean; status: string } => {
  if (!API_KEY || API_KEY === "MISSING_API_KEY") {
    return {
      isConfigured: false,
      status: "API Key not configured"
    };
  }
  return {
    isConfigured: true,
    status: "Gemini API configured"
  };
};



// Legacy single image analysis function - maintained for backward compatibility
export const analyzeLabelViaservice = async (
  imageBase64: string, 
  mimeType: string, 
  beverageCategory: BeverageCategory,
  productRequirements?: ProductRequirements
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is not configured. Please contact support or check environment variables.");
  }
  
  try {
    const imagePart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: imageBase64,
      },
    };

    // Get the category-specific prompt
    let enhancedPrompt = getCategorySpecificPrompt(beverageCategory);
    
    // Add category information to the prompt
    enhancedPrompt = `BEVERAGE CATEGORY: ${beverageCategory.toUpperCase().replace('-', ' ')}\n\n` + enhancedPrompt;

    // Build the prompt with product requirements information (legacy support)
    if (productRequirements) {
      const requirementsText = `

**CRITICAL: PRODUCT REQUIREMENTS SPECIFIED BY USER:**
The user has specified which ingredients are present in their product. You MUST follow these instructions exactly:

${productRequirements.includesSulfites ? '- Sulfite Declaration: This product CONTAINS sulfites. Look for sulfite declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required sulfite declaration is missing."' : '- Sulfite Declaration: This product does NOT contain sulfites. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain sulfites." Do not evaluate for sulfite declarations.'}

${productRequirements.includesYellowNumberFive ? '- FD&C Yellow No. 5 Declaration: This product CONTAINS FD&C Yellow No. 5. Look for FD&C Yellow No. 5 declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required FD&C Yellow No. 5 declaration is missing."' : '- FD&C Yellow No. 5 Declaration: This product does NOT contain FD&C Yellow No. 5. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain FD&C Yellow No. 5." Do not evaluate for color declarations.'}

${productRequirements.includesAspartame ? '- Aspartame Declaration: This product CONTAINS aspartame. Look for aspartame/phenylalanine declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required aspartame declaration is missing."' : '- Aspartame Declaration: This product does NOT contain aspartame. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain aspartame." Do not evaluate for aspartame declarations.'}

REMEMBER: Start each TTB Compliance Notes section with the exact status: "COMPLIANT:", "NON-COMPLIANT:", "POTENTIAL ISSUE:", or "NOT REQUIRED:"

`;
      enhancedPrompt += requirementsText;
    }

    const textPart: Part = {
      text: enhancedPrompt,
    };

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      // No specific config like thinkingConfig or tools needed for this basic analysis.
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("Received an empty response from the AI. The label might be unclear or the analysis failed.");
    }
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API:", error);
    if (error.message && error.message.includes('API key not valid')) {
        throw new Error("The configured Gemini API Key is invalid. Please verify your API_KEY.");
    }
    if (error.message && error.message.includes('quota')) {
        throw new Error("You have exceeded your Gemini API quota. Please check your usage and limits.");
    }
    throw new Error(`Failed to analyze label: ${error.message || 'Unknown API error'}`);
  }
};

// New multi-image analysis function
export const analyzeMultipleLabelsViaService = async (
  images: LabelImage[],
  beverageCategory: BeverageCategory,
  productRequirements?: ProductRequirements
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is not configured. Please contact support or check environment variables.");
  }

  if (images.length === 0) {
    throw new Error("No images provided for analysis.");
  }
  
  try {
    // Create image parts for all uploaded images
    const imageParts: Part[] = images.map((image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    }));

    // Get the category-specific prompt
    let enhancedPrompt = getCategorySpecificPrompt(beverageCategory);
    
    // Add category information to the prompt
    enhancedPrompt = `BEVERAGE CATEGORY: ${beverageCategory.toUpperCase().replace('-', ' ')}\n\n` + enhancedPrompt;

    // Add multi-image context
    const imageContext = images.map((image, index) => 
      `Image ${index + 1}: ${image.labelType.toUpperCase()} LABEL - ${image.labelType === 'front' ? 'Main product label with brand name, product type, alcohol content' : 
        image.labelType === 'back' ? 'Back label with ingredients, allergen warnings, producer information' :
        image.labelType === 'neck' ? 'Neck or collar label with additional branding or age statements' :
        image.labelType === 'side' ? 'Side panel or additional label information' :
        'Additional stickers, medallions, or supplementary label information'}`
    ).join('\n');

    const multiImageInstructions = `

**MULTI-IMAGE ANALYSIS INSTRUCTIONS:**
You are analyzing ${images.length} label image(s) for a single alcoholic beverage product. Each image shows a different part of the product labeling:

${imageContext}

IMPORTANT: Analyze ALL images collectively as they represent different parts of the SAME product. Look across all images to find required information. For example:
- Brand name might be on the front label
- Ingredients and allergen warnings might be on the back label  
- Age statements might be on neck labels
- Producer information might be split across multiple labels

When evaluating compliance, consider information from ALL provided images. If required information appears on ANY of the images, mark it as present. Only mark items as missing if they don't appear on any of the provided label images.

`;

    enhancedPrompt = multiImageInstructions + enhancedPrompt;

    // Build the prompt with product requirements information
    if (productRequirements) {
      const requirementsText = `

**CRITICAL: PRODUCT REQUIREMENTS SPECIFIED BY USER:**
The user has specified which ingredients are present in their product. You MUST follow these instructions exactly:

${productRequirements.includesSulfites ? '- Sulfite Declaration: This product CONTAINS sulfites. Look across ALL images for sulfite declarations and evaluate compliance. If missing from all images, mark as "NON-COMPLIANT: Required sulfite declaration is missing."' : '- Sulfite Declaration: This product does NOT contain sulfites. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain sulfites." Do not evaluate for sulfite declarations.'}

${productRequirements.includesYellowNumberFive ? '- FD&C Yellow No. 5 Declaration: This product CONTAINS FD&C Yellow No. 5. Look across ALL images for FD&C Yellow No. 5 declarations and evaluate compliance. If missing from all images, mark as "NON-COMPLIANT: Required FD&C Yellow No. 5 declaration is missing."' : '- FD&C Yellow No. 5 Declaration: This product does NOT contain FD&C Yellow No. 5. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain FD&C Yellow No. 5." Do not evaluate for color declarations.'}

${productRequirements.includesAspartame ? '- Aspartame Declaration: This product CONTAINS aspartame. Look across ALL images for aspartame/phenylalanine declarations and evaluate compliance. If missing from all images, mark as "NON-COMPLIANT: Required aspartame declaration is missing."' : '- Aspartame Declaration: This product does NOT contain aspartame. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain aspartame." Do not evaluate for aspartame declarations.'}

REMEMBER: Start each TTB Compliance Notes section with the exact status: "COMPLIANT:", "NON-COMPLIANT:", "POTENTIAL ISSUE:", or "NOT REQUIRED:"

`;
      enhancedPrompt += requirementsText;
    }

    const textPart: Part = {
      text: enhancedPrompt,
    };

    // Combine all parts (images + text prompt)
    const allParts = [...imageParts, textPart];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: allParts },
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("Received an empty response from the AI. The labels might be unclear or the analysis failed.");
    }
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API for multi-image analysis:", error);
    if (error.message && error.message.includes('API key not valid')) {
        throw new Error("The configured Gemini API Key is invalid. Please verify your API_KEY.");
    }
    if (error.message && error.message.includes('quota')) {
        throw new Error("You have exceeded your Gemini API quota. Please check your usage and limits.");
    }
    throw new Error(`Failed to analyze labels: ${error.message || 'Unknown API error'}`);
  }
};

// New label comparison function for TTB submission analysis
export const compareLabelVersionsViaService = async (
  comparison: LabelComparison
): Promise<string> => {
  if (!API_KEY) {
    throw new Error("Gemini API Key is not configured. Please contact support or check environment variables.");
  }

  if (comparison.oldImages.length === 0 || comparison.newImages.length === 0) {
    throw new Error("Both old and new images are required for comparison.");
  }
  
  try {
    // Create image parts for old images
    const oldImageParts: Part[] = comparison.oldImages.map((image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    }));

    // Create image parts for new images
    const newImageParts: Part[] = comparison.newImages.map((image) => ({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64,
      },
    }));

    const comparisonInstructions = `

**URGENT: LABEL CHANGE DETECTION TASK**

You have TWO DIFFERENT alcohol label images to compare. They are NOT identical.

**YOUR IMAGES:**
1. CURRENT (approved) label 
2. PROPOSED (new design) label

**STEP 1 - MANDATORY AREA CHECK:**
Look at the bottom-left corner of BOTH images (where volume is typically shown):
- What text do you see in the bottom-left of the CURRENT image?
- What text do you see in the bottom-left of the PROPOSED image?
- Are they the same or different?

**STEP 2 - SYSTEMATIC COMPARISON:**
Compare these areas in both images:
- Bottom corners (volume info like "750 ML")
- Top area (brand names)  
- Center area (product descriptions)
- Small text and numbers everywhere

**CRITICAL RULE:**
If you see "750 ML" in one image but it's missing from the other image, that is a CRITICAL CHANGE requiring TTB submission.

**IMPORTANT:**
- These images have differences - find them
- Do not conclude "no changes" without examining every text element
- Start by describing what you see in the bottom-left of each image

`;

    // Add product requirements context
    let requirementsContext = '';
    if (comparison.productRequirements) {
      requirementsContext = `

**PRODUCT REQUIREMENTS CONTEXT:**
${comparison.productRequirements.includesSulfites ? '- Product CONTAINS sulfites' : '- Product does NOT contain sulfites'}
${comparison.productRequirements.includesYellowNumberFive ? '- Product CONTAINS FD&C Yellow No. 5' : '- Product does NOT contain FD&C Yellow No. 5'}
${comparison.productRequirements.includesAspartame ? '- Product CONTAINS aspartame' : '- Product does NOT contain aspartame'}

`;
    }

    const textPart: Part = {
      text: comparisonInstructions + requirementsContext + COMPARISON_PROMPT,
    };

    // Combine all parts (old images + new images + text prompt)
    const allParts = [...oldImageParts, ...newImageParts, textPart];

    const response: GenerateContentResponse = await ai.models.generateContent({
      model: model,
      contents: { parts: allParts },
    });
    
    const text = response.text;
    if (!text) {
        throw new Error("Received an empty response from the AI. The label comparison might have failed.");
    }
    return text;

  } catch (error: any) {
    console.error("Error calling Gemini API for label comparison:", error);
    if (error.message && error.message.includes('API key not valid')) {
        throw new Error("The configured Gemini API Key is invalid. Please verify your API_KEY.");
    }
    if (error.message && error.message.includes('quota')) {
        throw new Error("You have exceeded your Gemini API quota. Please check your usage and limits.");
    }
    throw new Error(`Failed to compare labels: ${error.message || 'Unknown API error'}`);
  }
};

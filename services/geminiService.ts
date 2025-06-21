
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GEMINI_PROMPT } from '../constants';
import { ProductRequirements } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is missing. Please set the API_KEY environment variable.");
  // No throw here, App.tsx will handle UI notification
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Provide a dummy if missing to avoid constructor error
const model = 'gemini-2.5-flash-preview-04-17';

export const analyzeLabelViaservice = async (
  imageBase64: string, 
  mimeType: string, 
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

    // Build the prompt with product requirements information
    let enhancedPrompt = GEMINI_PROMPT;
    
    if (productRequirements) {
      const requirementsText = `

**CRITICAL: PRODUCT REQUIREMENTS SPECIFIED BY USER:**
The user has specified which ingredients are present in their product. You MUST follow these instructions exactly:

${productRequirements.includesSulfites ? '- Item 8 (Declaration of Sulfites): This product CONTAINS sulfites. Look for sulfite declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required sulfite declaration is missing."' : '- Item 8 (Declaration of Sulfites): This product does NOT contain sulfites. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain sulfites." Do not evaluate for sulfite declarations.'}

${productRequirements.includesYellowNumberFive ? '- Item 9 (Declaration of FD&C Yellow No. 5): This product CONTAINS FD&C Yellow No. 5. Look for FD&C Yellow No. 5 declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required FD&C Yellow No. 5 declaration is missing."' : '- Item 9 (Declaration of FD&C Yellow No. 5): This product does NOT contain FD&C Yellow No. 5. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain FD&C Yellow No. 5." Do not evaluate for color declarations.'}

${productRequirements.includesAspartame ? '- Item 10 (Declaration of Aspartame): This product CONTAINS aspartame. Look for aspartame/phenylalanine declarations and evaluate compliance. If missing, mark as "NON-COMPLIANT: Required aspartame declaration is missing."' : '- Item 10 (Declaration of Aspartame): This product does NOT contain aspartame. You MUST mark TTB Compliance Notes as "NOT REQUIRED: This product does not contain aspartame." Do not evaluate for aspartame declarations.'}

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

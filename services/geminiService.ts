
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

**PRODUCT REQUIREMENTS SPECIFIED BY USER:**
Based on the user's product knowledge, please pay special attention to these items:

${productRequirements.includesSulfites ? '- Item 8 (Declaration of Sulfites): This product CONTAINS sulfites - evaluate if the sulfite declaration is present and compliant.' : '- Item 8 (Declaration of Sulfites): This product does NOT contain sulfites - mark as "NOT REQUIRED: This product does not contain sulfites."'}

${productRequirements.includesYellowNumberFive ? '- Item 9 (Declaration of FD&C Yellow No. 5): This product CONTAINS FD&C Yellow No. 5 - evaluate if the declaration is present and compliant.' : '- Item 9 (Declaration of FD&C Yellow No. 5): This product does NOT contain FD&C Yellow No. 5 - mark as "NOT REQUIRED: This product does not contain FD&C Yellow No. 5."'}

${productRequirements.includesAspartame ? '- Item 10 (Declaration of Aspartame): This product CONTAINS aspartame - evaluate if the aspartame/phenylalanine declaration is present and compliant.' : '- Item 10 (Declaration of Aspartame): This product does NOT contain aspartame - mark as "NOT REQUIRED: This product does not contain aspartame."'}

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

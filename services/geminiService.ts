
import { GoogleGenAI, GenerateContentResponse, Part } from "@google/genai";
import { GEMINI_PROMPT } from '../constants';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.error("Gemini API Key is missing. Please set the API_KEY environment variable.");
  // No throw here, App.tsx will handle UI notification
}

const ai = new GoogleGenAI({ apiKey: API_KEY || "MISSING_API_KEY" }); // Provide a dummy if missing to avoid constructor error
const model = 'gemini-2.5-flash-preview-04-17';

export const analyzeLabelViaservice = async (imageBase64: string, mimeType: string): Promise<string> => {
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

    const textPart: Part = {
      text: GEMINI_PROMPT,
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


import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { ImageUploader } from './components/ImageUploader';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { analyzeLabelViaservice } from './services/geminiService';
import { ProductRequirements } from './types';
import { AlertTriangle, CheckCircle, Info, UploadCloud, Settings } from 'lucide-react';

// Gemini supported MIME types for gemini-2.5-flash-preview-04-17
const GEMINI_SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const CONVERSION_TARGET_MIME_TYPE = 'image/png';

const convertImageToSupportedFormat = (
  file: File,
  targetMimeType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<{ base64: string; mimeType: string; previewUrl: string }> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
        return reject(new Error(`File is too large for conversion (${(file.size / (1024*1024)).toFixed(2)}MB). Max 5MB.`));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Failed to get canvas context for image conversion.'));
        }
        ctx.drawImage(img, 0, 0, img.width, img.height);
        try {
          const dataUrl = canvas.toDataURL(targetMimeType);
          const base64 = dataUrl.split(',')[1];
          if (!base64) {
            return reject(new Error('Failed to extract base64 data from converted image.'));
          }
          resolve({
            base64,
            mimeType: targetMimeType,
            previewUrl: dataUrl,
          });
        } catch (e) {
          console.error("Canvas toDataURL error:", e);
          reject(new Error(`Failed to convert image to ${targetMimeType}. The image format might be corrupt or highly unusual.`));
        }
      };
      img.onerror = () => reject(new Error('Failed to load image for conversion. It might be corrupt or an unsupported format by the browser.'));
      
      if (event.target?.result) {
        img.src = event.target.result as string;
      } else {
        reject(new Error('FileReader did not successfully read the file for conversion.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file using FileReader for conversion.'));
    reader.readAsDataURL(file);
  });
};


const App: React.FC = () => {
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageMimeType, setImageMimeType] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeyMissing, setApiKeyMissing] = useState<boolean>(false);
  const [hasAnalyzed, setHasAnalyzed] = useState<boolean>(false);
  
  // Product requirements state - start with all checkboxes unchecked
  const [productRequirements, setProductRequirements] = useState<ProductRequirements>({
    includesSulfites: false,
    includesYellowNumberFive: false,
    includesAspartame: false,
  });

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      setError("Gemini API Key is missing. Please ensure it's set in your environment variables.");
    }
  }, []);

  const handleFileSelect = useCallback((file: File | null) => {
    if (file) {
      setError(null);
      setAnalysisResult(null);
      setHasAnalyzed(false);
      setUploadedFile(file); 

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File is too large (${(file.size / (1024*1024)).toFixed(2)}MB). Maximum allowed size is 5MB.`);
        setUploadedFile(null);
        setImagePreviewUrl(null);
        setImageBase64(null);
        setImageMimeType(null);
        return;
      }

      setIsLoading(true); 

      const tempPreviewUrl = URL.createObjectURL(file);
      setImagePreviewUrl(tempPreviewUrl);

      if (GEMINI_SUPPORTED_MIME_TYPES.includes(file.type)) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const fullDataUrl = reader.result as string;
          URL.revokeObjectURL(tempPreviewUrl); 
          setImagePreviewUrl(fullDataUrl);
          setImageBase64(fullDataUrl.split(',')[1]);
          setImageMimeType(file.type);
          setIsLoading(false);
        };
        reader.onerror = () => {
          URL.revokeObjectURL(tempPreviewUrl); 
          setError("Failed to read the image file.");
          setImagePreviewUrl(null);
          setImageBase64(null);
          setImageMimeType(null);
          setUploadedFile(null);
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } else {
        convertImageToSupportedFormat(file, CONVERSION_TARGET_MIME_TYPE)
          .then(converted => {
            URL.revokeObjectURL(tempPreviewUrl); 
            setImageBase64(converted.base64);
            setImageMimeType(converted.mimeType);
            setImagePreviewUrl(converted.previewUrl);
          })
          .catch(conversionError => {
            URL.revokeObjectURL(tempPreviewUrl); 
            console.error("Image conversion failed:", conversionError);
            setError(`Image conversion failed: ${conversionError.message}. Try a different format (PNG, JPEG, WEBP).`);
            setImagePreviewUrl(null); 
            setImageBase64(null);
            setImageMimeType(null);
            setUploadedFile(null); 
          })
          .finally(() => {
            setIsLoading(false);
          });
      }
    } else {
      setUploadedFile(null);
      setImagePreviewUrl(null);
      setImageBase64(null);
      setImageMimeType(null);
      setError(null);
      setAnalysisResult(null);
    }
  }, []);

  const handleAnalyze = async () => {
    if (!imageBase64 || !imageMimeType) {
      setError("Please upload and process an image first.");
      return;
    }
    if (apiKeyMissing) {
       setError("Cannot analyze: Gemini API Key is missing.");
       return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result = await analyzeLabelViaservice(imageBase64, imageMimeType, productRequirements);
      setAnalysisResult(result);
      setHasAnalyzed(true);
    } catch (e: any) {
      console.error("Analysis failed:", e);
      let errorMessage = "An error occurred during analysis.";
      if (typeof e.message === 'string') {
        if (e.message.includes('INTERNAL')) {
             errorMessage = "The AI service encountered an internal error. Please try again later.";
        } else if (e.message.includes('Unsupported MIME type')) {
            errorMessage = "The image format is not supported by the AI, even after conversion attempts. Please try PNG, JPEG, or WEBP.";
        }
         else {
            errorMessage = e.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const currentError = error;

  // Component for selecting product requirements
  const ProductRequirementsSelector: React.FC = () => {
    return (
      <div className="mb-6 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
        <div className="flex items-center mb-4">
          <Settings className="h-5 w-5 text-slate-600 dark:text-slate-400 mr-3" />
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-200">Product Requirements</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Do these apply to your product?</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <label className={`flex items-center space-x-3 ${isLoading || hasAnalyzed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={productRequirements.includesSulfites}
              onChange={(e) => setProductRequirements({ ...productRequirements, includesSulfites: e.target.checked })}
              disabled={isLoading || hasAnalyzed}
              className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 rounded focus:ring-sky-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-slate-800 dark:text-slate-200 font-medium">Declaration of Sulfites</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">Check if your product contains sulfites</p>
            </div>
          </label>
          
          <label className={`flex items-center space-x-3 ${isLoading || hasAnalyzed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={productRequirements.includesYellowNumberFive}
              onChange={(e) => setProductRequirements({ ...productRequirements, includesYellowNumberFive: e.target.checked })}
              disabled={isLoading || hasAnalyzed}
              className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 rounded focus:ring-sky-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-slate-800 dark:text-slate-200 font-medium">Declaration of Yellow Number Five</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">Check if your product contains Yellow #5 dye</p>
            </div>
          </label>
          
          <label className={`flex items-center space-x-3 ${isLoading || hasAnalyzed ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
            <input
              type="checkbox"
              checked={productRequirements.includesAspartame}
              onChange={(e) => setProductRequirements({ ...productRequirements, includesAspartame: e.target.checked })}
              disabled={isLoading || hasAnalyzed}
              className="w-4 h-4 text-sky-600 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500 rounded focus:ring-sky-500 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <div>
              <span className="text-slate-800 dark:text-slate-200 font-medium">Declaration of Aspartame</span>
              <p className="text-sm text-slate-600 dark:text-slate-400">Check if your product contains aspartame</p>
            </div>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-sky-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6 md:p-10 transition-colors duration-300">
          <h2 className="text-3xl font-bold mb-8 text-sky-600 dark:text-sky-400 text-center transition-colors duration-300">Analyze Your Alcohol Label</h2>
          
          {apiKeyMissing && !currentError?.includes("API Key") && (
            <div className="mb-6 p-4 bg-red-700 border border-red-500 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-300" />
              <p className="text-red-200">
                <strong>Configuration Error:</strong> The Gemini API Key (API_KEY) is not configured. This application cannot function without it.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-8"> {/* Changed to flex flex-col */}
            <div className="w-full max-w-lg mx-auto space-y-6"> {/* Centered uploader and button */}
              <ImageUploader 
                onFileSelect={handleFileSelect} 
                previewUrl={imagePreviewUrl}
                disabled={isLoading || apiKeyMissing}
              />
              
              {/* Product Requirements Selector */}
              <ProductRequirementsSelector />
              
              <button
                onClick={handleAnalyze}
                disabled={!uploadedFile || !imageBase64 || isLoading || apiKeyMissing || hasAnalyzed}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 text-lg disabled:cursor-not-allowed"
              >
                {isLoading && (!analysisResult && !currentError) ? <LoadingSpinner /> : <CheckCircle className="h-5 w-5" />}
                <span>{isLoading && (!analysisResult && !currentError) ? 'Processing...' : 'Analyze Label'}</span>
              </button>
            </div>

            <div className="w-full space-y-6"> {/* Analysis display takes full width below */}
              {currentError && (
                <div className="p-4 bg-red-700 border border-red-500 rounded-lg flex items-start space-x-3">
                  <AlertTriangle className="h-6 w-6 text-red-300 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-red-200">Error</h3>
                    <p className="text-red-300 text-sm">{currentError}</p>
                  </div>
                </div>
              )}
              {isLoading && !analysisResult && !currentError && (
                 <div className="p-4 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center min-h-[200px] transition-colors duration-300">
                    <LoadingSpinner />
                    <p className="ml-3 text-slate-700 dark:text-slate-300">AI is thinking or image is processing... please wait.</p>
                 </div>
              )}
              {!isLoading && !analysisResult && !currentError && !apiKeyMissing && (
                <div className="p-10 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center min-h-[200px] text-center transition-colors duration-300">
                  <UploadCloud className="h-12 w-12 text-sky-500 mb-4" />
                  <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Awaiting Label Submission</h3>
                  <p className="text-slate-600 dark:text-slate-400">Upload a label image and click "Analyze Label" to see the compliance report here.</p>
                </div>
              )}
              {analysisResult && !currentError && <AnalysisDisplay result={analysisResult} productRequirements={productRequirements} />}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default App;

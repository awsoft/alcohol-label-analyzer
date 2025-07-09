import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MultiImageUploader } from './components/MultiImageUploader';
import { BeverageCategorySelector } from './components/BeverageCategorySelector';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LabelComparisonComponent } from './components/LabelComparison';
import { analyzeMultipleLabelsViaService } from './services/geminiService';
import { ProductRequirements, BeverageCategory, LabelImage } from './types';
import { AlertTriangle, CheckCircle, UploadCloud, Settings, FileSearch, GitCompare } from 'lucide-react';
import { ThemeProvider } from './contexts/ThemeContext';

type AppMode = 'analysis' | 'comparison';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('analysis');
  const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
  
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

  // Beverage category state - default to distilled spirits
  const [beverageCategory, setBeverageCategory] = useState<BeverageCategory>('distilled-spirits');

  useEffect(() => {
    if (!process.env.API_KEY) {
      setApiKeyMissing(true);
      setError("Gemini API Key is missing. Please ensure it's set in your environment variables.");
    }
  }, []);

  const handleImagesChange = useCallback((newImages: LabelImage[]) => {
    setLabelImages(newImages);
    setError(null);
    setAnalysisResult(null);
    setHasAnalyzed(false);
  }, []);

  const handleAnalyze = async () => {
    if (labelImages.length === 0) {
      setError("Please upload at least one label image first.");
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
      const result = await analyzeMultipleLabelsViaService(labelImages, beverageCategory, productRequirements);
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

  const handleModeChange = (mode: AppMode) => {
    setAppMode(mode);
    // Clear state when switching modes
    setLabelImages([]);
    setAnalysisResult(null);
    setError(null);
    setHasAnalyzed(false);
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

  // Mode selector component
  const ModeSelector: React.FC = () => {
    return (
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg inline-flex">
          <button
            onClick={() => handleModeChange('analysis')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
              appMode === 'analysis'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <FileSearch className="h-4 w-4" />
            <span>New Label</span>
          </button>
          <button
            onClick={() => handleModeChange('comparison')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
              appMode === 'comparison'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
            }`}
          >
            <GitCompare className="h-4 w-4" />
            <span>Label Change</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-sky-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Header 
        analysisStatus={
          isLoading 
            ? "Processing..." 
            : hasAnalyzed 
              ? (error ? "Analysis failed" : "Analysis completed")
              : "Ready"
        }
      />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6 md:p-10 transition-colors duration-300">
          {/* Mode Selector */}
          <ModeSelector />

          {apiKeyMissing && !currentError?.includes("API Key") && (
            <div className="mb-6 p-4 bg-red-700 border border-red-500 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-300" />
              <p className="text-red-200">
                <strong>Configuration Error:</strong> The Gemini API Key (API_KEY) is not configured. This application cannot function without it.
              </p>
            </div>
          )}

          {/* Render content based on selected mode */}
          {appMode === 'comparison' ? (
            <LabelComparisonComponent disabled={apiKeyMissing} />
          ) : (
            <>
              <h2 className="text-3xl font-bold mb-8 text-sky-600 dark:text-sky-400 text-center transition-colors duration-300">Analyze Your Alcohol Labels</h2>
              
              <div className="flex flex-col gap-8">
                <div className="w-full max-w-4xl mx-auto space-y-6">
                  {/* Multi-Image Uploader */}
                  <MultiImageUploader 
                    images={labelImages}
                    onImagesChange={handleImagesChange}
                    disabled={isLoading || apiKeyMissing}
                    maxImages={5}
                  />
                  
                  {/* Product Requirements Selector */}
                  <ProductRequirementsSelector />
                  
                  {/* Beverage Category Selector */}
                  <BeverageCategorySelector
                    selectedCategory={beverageCategory}
                    onCategoryChange={(category: BeverageCategory) => setBeverageCategory(category)}
                    disabled={isLoading || hasAnalyzed}
                  />
                  
                  <button
                    onClick={handleAnalyze}
                    disabled={labelImages.length === 0 || isLoading || apiKeyMissing || hasAnalyzed}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 text-lg disabled:cursor-not-allowed"
                  >
                    {isLoading && (!analysisResult && !currentError) ? <LoadingSpinner /> : <CheckCircle className="h-5 w-5" />}
                    <span>
                      {isLoading && (!analysisResult && !currentError) ? 'Processing...' : 
                       labelImages.length === 0 ? 'Upload Images to Analyze' :
                       labelImages.length === 1 ? 'Analyze Label' : 
                       `Analyze ${labelImages.length} Labels`}
                    </span>
                  </button>
                </div>

                <div className="w-full space-y-6">
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
                        <p className="ml-3 text-slate-700 dark:text-slate-300">AI is analyzing your label images... please wait.</p>
                     </div>
                  )}
                  {!isLoading && !analysisResult && !currentError && !apiKeyMissing && (
                    <div className="p-10 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center min-h-[200px] text-center transition-colors duration-300">
                      <UploadCloud className="h-12 w-12 text-sky-500 mb-4" />
                      <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Ready for Multi-Label Analysis</h3>
                      <p className="text-slate-600 dark:text-slate-400 max-w-md">
                        Upload your label images (front, back, neck, etc.) and click "Analyze Labels" to get a comprehensive TTB compliance report.
                      </p>
                    </div>
                  )}
                  {analysisResult && !currentError && <AnalysisDisplay result={analysisResult} productRequirements={productRequirements} />}
                </div>
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
      <Analytics />
    </div>
  );
};

export default App;

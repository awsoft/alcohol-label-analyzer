import React, { useState, useCallback, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MultiImageUploader } from './components/MultiImageUploader';
import { BeverageCategorySelector } from './components/BeverageCategorySelector';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { LabelComparisonComponent } from './components/LabelComparison';
import { ApplicationVerification } from './components/ApplicationVerification';
import { analyzeLabels, getApiKeyStatus } from './services/geminiService';
import { AnalysisReport } from './shared/analysisTypes';
import { ProductRequirements, BeverageCategory, LabelImage } from './types';
import { AlertTriangle, CheckCircle, ClipboardCheck, UploadCloud, Settings, FileSearch, GitCompare } from 'lucide-react';

type AppMode = 'verification' | 'analysis' | 'comparison';

const App: React.FC = () => {
  const [appMode, setAppMode] = useState<AppMode>('verification');
  const [labelImages, setLabelImages] = useState<LabelImage[]>([]);
  
  const [analysisResult, setAnalysisResult] = useState<AnalysisReport | null>(null);
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

  // A key can come from the server (/api endpoints) or from localStorage (set via Settings)
  const refreshApiKeyStatus = useCallback(() => {
    getApiKeyStatus().then(({ isConfigured }) => setApiKeyMissing(!isConfigured));
  }, []);

  useEffect(() => {
    refreshApiKeyStatus();
  }, [refreshApiKeyStatus]);

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
      const result = await analyzeLabels({
        images: labelImages.map(({ base64, mimeType, labelType }) => ({ base64, mimeType, labelType })),
        beverageCategory,
        productRequirements,
      });
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
    const modes: { id: AppMode; label: string; Icon: React.ElementType }[] = [
      { id: 'verification', label: 'Verify Application', Icon: ClipboardCheck },
      { id: 'analysis', label: 'New Label', Icon: FileSearch },
      { id: 'comparison', label: 'Label Change', Icon: GitCompare },
    ];
    return (
      <div className="flex justify-center mb-8">
        <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg inline-flex flex-wrap justify-center">
          {modes.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => handleModeChange(id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center space-x-2 ${
                appMode === id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-sky-50 dark:from-slate-900 dark:via-slate-800 dark:to-sky-900 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      <Header onApiKeyChange={refreshApiKeyStatus} />
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-slate-800 shadow-2xl rounded-xl p-6 md:p-10 transition-colors duration-300">
          {/* Mode Selector */}
          <ModeSelector />

          {apiKeyMissing && (
            <div className="mb-6 p-4 bg-red-700 border border-red-500 rounded-lg flex items-center space-x-3">
              <AlertTriangle className="h-6 w-6 text-red-300" />
              <p className="text-red-200">
                <strong>Configuration Error:</strong> No Gemini API key is configured. Add one via the Settings menu (gear icon in the header), or set GEMINI_API_KEY in your environment.
              </p>
            </div>
          )}

          {/* Render content based on selected mode */}
          {appMode === 'verification' ? (
            <ApplicationVerification disabled={apiKeyMissing} />
          ) : appMode === 'comparison' ? (
            <LabelComparisonComponent disabled={apiKeyMissing} />
          ) : (
            <>
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <FileSearch className="h-8 w-8 text-sky-600 dark:text-sky-400 mr-3" />
                  <h2 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Analyze Your Alcohol Labels</h2>
                </div>
                <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                  Upload your label images (front, back, neck, and more), choose your beverage category, and get a comprehensive TTB compliance report — every mandatory element checked, downloadable as a PDF.
                </p>
              </div>
              
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
                  {analysisResult && !currentError && <AnalysisDisplay report={analysisResult} />}
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

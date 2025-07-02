import React, { useState, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { ComparisonResults } from './ComparisonResults';
import { compareLabelVersionsViaService } from '../services/geminiService';
import { LabelImage, BeverageCategory, ProductRequirements, LabelComparison } from '../types';
import { AlertTriangle, ArrowRight, GitCompare, Upload, X } from 'lucide-react';

interface LabelComparisonProps {
  disabled?: boolean;
}

export const LabelComparisonComponent: React.FC<LabelComparisonProps> = ({ disabled = false }) => {
  const [currentImage, setCurrentImage] = useState<LabelImage | null>(null);
  const [proposedImage, setProposedImage] = useState<LabelImage | null>(null);
  
  const [comparisonResult, setComparisonResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to convert file to LabelImage
  const fileToLabelImage = async (file: File): Promise<LabelImage> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data:image/...;base64, prefix
        
        resolve({
          id: Math.random().toString(36).substr(2, 9),
          file,
          labelType: 'other', // Default type for simple comparison
          base64: base64Data,
          mimeType: file.type,
          previewUrl: base64,
        });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCurrentImageUpload = useCallback(async (file: File) => {
    try {
      const labelImage = await fileToLabelImage(file);
      setCurrentImage(labelImage);
      setError(null);
      setComparisonResult(null);
    } catch (error) {
      setError('Failed to process the current image');
    }
  }, []);

  const handleProposedImageUpload = useCallback(async (file: File) => {
    try {
      const labelImage = await fileToLabelImage(file);
      setProposedImage(labelImage);
      setError(null);
      setComparisonResult(null);
    } catch (error) {
      setError('Failed to process the proposed image');
    }
  }, []);

  const handleCompare = async () => {
    if (!currentImage || !proposedImage) {
      setError("Please upload both current and proposed label images.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setComparisonResult(null);

    try {
      const comparison: LabelComparison = {
        oldImages: [currentImage],
        newImages: [proposedImage],
        beverageCategory: 'distilled-spirits', // Default category for comparison
        productRequirements: { // Default empty requirements for comparison
          includesSulfites: false,
          includesYellowNumberFive: false,
          includesAspartame: false,
        }
      };

      const result = await compareLabelVersionsViaService(comparison);
      setComparisonResult(result);
    } catch (e: any) {
      console.error("Comparison failed:", e);
      let errorMessage = "An error occurred during comparison.";
      if (typeof e.message === 'string') {
        if (e.message.includes('INTERNAL')) {
          errorMessage = "The AI service encountered an internal error. Please try again later.";
        } else {
          errorMessage = e.message;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };



  // Single image upload component
  const SingleImageUpload: React.FC<{
    image: LabelImage | null;
    onImageUpload: (file: File) => void;
    onRemove: () => void;
    title: string;
    badge: string;
    badgeColor: string;
    disabled?: boolean;
  }> = ({ image, onImageUpload, onRemove, title, badge, badgeColor, disabled }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onImageUpload(file);
      }
    };

    const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith('image/')) {
        onImageUpload(file);
      }
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center">
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
          <span className={`ml-2 px-2 py-1 ${badgeColor} text-xs rounded-md`}>
            {badge}
          </span>
        </div>
        
        {image ? (
          <div className="relative bg-white dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 p-4">
            <button
              onClick={onRemove}
              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={image.previewUrl}
              alt="Label preview"
              className="w-full h-auto max-h-96 object-contain rounded"
            />
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 text-center">
              {image.file.name}
            </p>
          </div>
        ) : (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              disabled 
                ? 'border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 cursor-not-allowed' 
                : 'border-slate-300 dark:border-slate-600 hover:border-sky-400 dark:hover:border-sky-500 bg-slate-50 dark:bg-slate-700/50 cursor-pointer'
            }`}
          >
            <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Drag and drop an image here, or click to select
            </p>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              disabled={disabled}
              className="hidden"
              id={`file-input-${title.replace(' ', '-').toLowerCase()}`}
            />
            <label
              htmlFor={`file-input-${title.replace(' ', '-').toLowerCase()}`}
              className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white ${
                disabled 
                  ? 'bg-slate-400 cursor-not-allowed' 
                  : 'bg-sky-600 hover:bg-sky-700 cursor-pointer'
              } transition-colors`}
            >
              Select Image
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <GitCompare className="h-8 w-8 text-sky-600 dark:text-sky-400 mr-3" />
          <h2 className="text-3xl font-bold text-sky-600 dark:text-sky-400">Label Change Analysis</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Upload your current and proposed label images to determine if TTB submission is required for the changes.
        </p>
      </div>

      {/* Image Upload Section */}
      <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 max-w-5xl mx-auto">
        {/* Current Image */}
        <div className="flex-1 max-w-sm">
          <SingleImageUpload
            image={currentImage}
            onImageUpload={handleCurrentImageUpload}
            onRemove={() => setCurrentImage(null)}
            title="Current Label"
            badge="Approved"
            badgeColor="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
            disabled={isLoading || disabled}
          />
        </div>

        {/* Arrow */}
        <div className="flex justify-center items-center px-4">
          <ArrowRight className="h-6 w-6 text-slate-400 hidden lg:block" />
          <ArrowRight className="h-5 w-5 text-slate-400 rotate-90 lg:hidden" />
        </div>

        {/* Proposed Image */}
        <div className="flex-1 max-w-sm">
          <SingleImageUpload
            image={proposedImage}
            onImageUpload={handleProposedImageUpload}
            onRemove={() => setProposedImage(null)}
            title="Proposed Label"
            badge="New Design"
            badgeColor="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
            disabled={isLoading || disabled}
          />
        </div>
      </div>

      {/* Compare Button */}
      <div className="max-w-md mx-auto">
        <button
          onClick={handleCompare}
          disabled={!currentImage || !proposedImage || isLoading || disabled}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center space-x-2 text-lg disabled:cursor-not-allowed"
        >
          {isLoading ? <LoadingSpinner /> : <GitCompare className="h-5 w-5" />}
          <span>
            {isLoading ? 'Analyzing Changes...' : 
             !currentImage || !proposedImage ? 'Upload Both Images to Compare' :
             'Analyze Label Changes'}
          </span>
        </button>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-red-700 border border-red-500 rounded-lg flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-300 mt-1 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-200">Error</h3>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {isLoading && !comparisonResult && !error && (
          <div className="p-6 bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg flex items-center justify-center min-h-[200px] transition-colors duration-300">
            <LoadingSpinner />
            <p className="ml-3 text-slate-700 dark:text-slate-300">AI is analyzing the changes between your label versions... please wait.</p>
          </div>
        )}
        
        {!isLoading && !comparisonResult && !error && (
          <div className="p-10 bg-slate-50 dark:bg-slate-700/50 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg flex flex-col items-center justify-center min-h-[200px] text-center transition-colors duration-300">
            <GitCompare className="h-12 w-12 text-sky-500 mb-4" />
            <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Ready for Label Change Analysis</h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md">
              Upload both your current and proposed label images to get an expert analysis of whether TTB submission is required for your changes.
            </p>
          </div>
        )}
        
        {comparisonResult && !error && currentImage && proposedImage && (
          <ComparisonResults
            result={comparisonResult}
            currentImageUrl={currentImage.previewUrl}
            proposedImageUrl={proposedImage.previewUrl}
          />
        )}
      </div>
    </div>
  );
}; 
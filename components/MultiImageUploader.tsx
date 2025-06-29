import React, { useCallback, useState } from 'react';
import { UploadCloud, XCircle } from 'lucide-react';
import { LabelImage, LabelType, LABEL_TYPES } from '../types';

interface MultiImageUploaderProps {
  images: LabelImage[];
  onImagesChange: (images: LabelImage[]) => void;
  disabled?: boolean;
  maxImages?: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Gemini supported MIME types
const GEMINI_SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

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

export const MultiImageUploader: React.FC<MultiImageUploaderProps> = ({ 
  images, 
  onImagesChange, 
  disabled = false,
  maxImages = 5 
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());

  const generateId = () => `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const processFile = async (file: File, labelType: LabelType): Promise<LabelImage> => {
    const id = generateId();
    
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File is too large (${(file.size / (1024*1024)).toFixed(2)}MB). Maximum allowed size is 5MB.`);
    }

    if (GEMINI_SUPPORTED_MIME_TYPES.includes(file.type)) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const fullDataUrl = reader.result as string;
          const base64 = fullDataUrl.split(',')[1];
          resolve({
            id,
            file,
            labelType,
            base64,
            mimeType: file.type,
            previewUrl: fullDataUrl,
          });
        };
        reader.onerror = () => reject(new Error("Failed to read the image file."));
        reader.readAsDataURL(file);
      });
    } else {
      const converted = await convertImageToSupportedFormat(file, CONVERSION_TARGET_MIME_TYPE);
      return {
        id,
        file,
        labelType,
        base64: converted.base64,
        mimeType: converted.mimeType,
        previewUrl: converted.previewUrl,
      };
    }
  };

  const handleFilesAdd = useCallback(async (files: FileList, labelType: LabelType = 'front') => {
    if (disabled) return;
    
    const fileArray = Array.from(files);
    const availableSlots = maxImages - images.length;
    const filesToProcess = fileArray.slice(0, availableSlots);
    
    if (fileArray.length > availableSlots) {
      const newErrors = new Map(errors);
      newErrors.set('maxImages', `Can only add ${availableSlots} more images (maximum ${maxImages} total)`);
      setErrors(newErrors);
    }

    for (const file of filesToProcess) {
      const fileId = generateId();
      setProcessingFiles(prev => new Set([...prev, fileId]));
      
      try {
        const labelImage = await processFile(file, labelType);
        onImagesChange([...images, labelImage]);
        
        // Clear any previous errors for this file
        const newErrors = new Map(errors);
        newErrors.delete(fileId);
        setErrors(newErrors);
      } catch (error: any) {
        const newErrors = new Map(errors);
        newErrors.set(fileId, error.message);
        setErrors(newErrors);
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileId);
          return newSet;
        });
      }
    }
  }, [images, onImagesChange, disabled, maxImages, errors]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, labelType: LabelType) => {
    const files = event.target.files;
    if (files) {
      handleFilesAdd(files, labelType);
    }
    event.target.value = ''; // Reset input
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    
    const files = event.dataTransfer.files;
    if (files) {
      handleFilesAdd(files, 'front'); // Default to front label for drag & drop
    }
  }, [handleFilesAdd, disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const removeImage = (imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    onImagesChange(updatedImages);
    
    // Clear any errors for this image
    const newErrors = new Map(errors);
    newErrors.delete(imageId);
    setErrors(newErrors);
  };

  const updateLabelType = (imageId: string, newLabelType: LabelType) => {
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, labelType: newLabelType } : img
    );
    onImagesChange(updatedImages);
  };

  const canAddMore = images.length < maxImages && !disabled;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">Label Images</h3>
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {images.length}/{maxImages} images
        </span>
      </div>

      {/* Error Display */}
      {errors.size > 0 && (
        <div className="space-y-2">
          {Array.from(errors.entries()).map(([key, error]) => (
            <div key={key} className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Images Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {images.map((image) => (
            <div key={image.id} className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                <img 
                  src={image.previewUrl} 
                  alt={`${image.labelType} label`}
                  className="w-full h-full object-contain bg-slate-50 dark:bg-slate-700"
                />
                {!disabled && (
                  <button 
                    onClick={() => removeImage(image.id)}
                    className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-md z-10"
                    aria-label="Remove image"
                  >
                    <XCircle size={16} />
                  </button>
                )}
              </div>
              
              {/* Label Type Selector */}
              <div className="p-3 border-t border-slate-200 dark:border-slate-600">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Label Type:
                </label>
                <select
                  value={image.labelType}
                  onChange={(e) => updateLabelType(image.id, e.target.value as LabelType)}
                  disabled={disabled}
                  className="w-full px-3 py-1.5 text-sm border border-slate-300 dark:border-slate-500 rounded-md bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {LABEL_TYPES.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.icon} {type.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area */}
      {canAddMore && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`
            flex flex-col items-center justify-center w-full h-48 
            border-2 border-dashed rounded-lg cursor-pointer 
            bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors
            ${dragOver ? 'border-sky-500 bg-sky-100 dark:bg-sky-700/30' : 'border-slate-300 dark:border-slate-600'}
          `}
        >
          <UploadCloud className={`w-12 h-12 mb-3 ${dragOver ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'}`} />
          <p className={`mb-2 text-sm ${dragOver ? 'text-sky-600 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
            <span className="font-semibold">Drop images here or click to upload</span>
          </p>
          <p className="text-xs text-slate-600 dark:text-slate-500 px-2 text-center mb-4">
            Supported: PNG, JPG, WEBP, HEIC, HEIF. Max 5MB per image.
          </p>
          
          {/* Label Type Buttons */}
          <div className="flex flex-wrap gap-2 justify-center">
            {LABEL_TYPES.map((type) => (
              <label key={type.id} className="relative">
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, type.id)}
                  accept="image/*"
                  multiple
                />
                <div className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs rounded-md cursor-pointer transition-colors flex items-center space-x-1">
                  <span>{type.icon}</span>
                  <span>{type.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Processing Indicator */}
      {processingFiles.size > 0 && (
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          Processing {processingFiles.size} image(s)...
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
        <p><strong>Tip:</strong> Upload different label views for comprehensive analysis:</p>
        <ul className="list-disc list-inside ml-2 space-y-0.5">
          <li>Front label: Brand name, product type, alcohol content</li>
          <li>Back label: Ingredients, allergen warnings, producer info</li>
          <li>Neck label: Additional branding or age statements</li>
          <li>Side/Other: Medallions, certifications, additional text</li>
        </ul>
      </div>
    </div>
  );
}; 
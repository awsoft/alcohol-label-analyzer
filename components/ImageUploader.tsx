
import React, { useCallback, useState } from 'react';
import { UploadCloud, Image as ImageIcon, XCircle } from 'lucide-react'; // Using lucide-react for icons

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void;
  previewUrl: string | null;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onFileSelect, previewUrl, disabled }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    onFileSelect(file);
    event.target.value = ''; // Reset input to allow re-uploading the same file
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
    if (disabled) return;
    const file = event.dataTransfer.files?.[0] || null;
    onFileSelect(file);
  }, [onFileSelect, disabled]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (disabled) return;
    setDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOver(false);
  }, []);

  const clearImage = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation(); // Prevent label click
    event.preventDefault(); // Prevent default button action
    onFileSelect(null);
  }

  return (
    <div className="space-y-4">
      <label
        htmlFor="image-upload"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          flex flex-col items-center justify-center w-full h-64 
          border-2 border-dashed rounded-lg cursor-pointer 
          bg-slate-100 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600/50 transition-colors
          ${dragOver ? 'border-sky-500 bg-sky-100 dark:bg-sky-700/30' : 'border-slate-300 dark:border-slate-600'}
          ${disabled ? 'cursor-not-allowed opacity-60' : ''}
        `}
        aria-disabled={disabled}
      >
        {previewUrl ? (
          <div className="relative w-full h-full p-2">
            <img src={previewUrl} alt="Label preview" className="object-contain w-full h-full rounded-md" />
            {!disabled && (
                 <button 
                    onClick={clearImage} 
                    className="absolute top-2 right-2 p-1 bg-red-600 hover:bg-red-500 rounded-full text-white shadow-md z-10"
                    aria-label="Remove image"
                 >
                    <XCircle size={20} />
                 </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <UploadCloud className={`w-12 h-12 mb-3 ${dragOver ? 'text-sky-500' : 'text-slate-500 dark:text-slate-400'}`} />
            <p className={`mb-2 text-sm ${dragOver ? 'text-sky-600 dark:text-sky-300' : 'text-slate-700 dark:text-slate-300'}`}>
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-500 px-2">
              Supported: PNG, JPG, WEBP, HEIC, HEIF. Others (like AVIF) converted to PNG. Max 5MB.
            </p>
          </div>
        )}
        <input 
          id="image-upload" 
          type="file" 
          className="hidden" 
          onChange={handleFileChange} 
          accept="image/*" 
          disabled={disabled}
        />
      </label>
      {previewUrl && !disabled && (
         <p className="text-xs text-slate-600 dark:text-slate-400 text-center">Change image by clicking or dragging a new one above.</p>
      )}
    </div>
  );
};

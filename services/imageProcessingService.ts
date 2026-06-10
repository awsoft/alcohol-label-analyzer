// Client-side image preparation for analysis uploads.

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB original-file cap

// Images at or under this size in a directly-supported format pass through
// untouched. Larger ones are downscaled/re-encoded so multi-image payloads
// stay well within the serverless request-body limit (~4.5 MB).
const PASS_THROUGH_MAX_BYTES = 1.5 * 1024 * 1024;
const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 0.9;

// Formats Gemini accepts as inline image data.
export const GEMINI_SUPPORTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
];

export interface PreparedImage {
  base64: string;
  mimeType: string;
  previewUrl: string;
}

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read the image file.'));
    reader.readAsDataURL(file);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load the image. It might be corrupt or an unsupported format for this browser.'));
    img.src = src;
  });

/**
 * Prepares an uploaded file for AI analysis: validates size, converts
 * unsupported formats, and downscales/re-encodes large images (longest side
 * capped at 2000px, JPEG) so requests stay small without losing label
 * legibility.
 */
export const prepareImageForAnalysis = async (file: File): Promise<PreparedImage> => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(`File is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum allowed size is 5MB.`);
  }

  const isSupported = GEMINI_SUPPORTED_MIME_TYPES.includes(file.type);
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif';

  // Small supported files go through unchanged. HEIC/HEIF always pass through:
  // Gemini accepts them, while most browsers cannot decode them onto a canvas.
  if ((isSupported && file.size <= PASS_THROUGH_MAX_BYTES) || isHeic) {
    const dataUrl = await readFileAsDataUrl(file);
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      throw new Error('Failed to extract image data from the file.');
    }
    return { base64, mimeType: file.type, previewUrl: dataUrl };
  }

  // Everything else: draw to a canvas (downscaling if needed) and re-encode.
  const sourceDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(sourceDataUrl);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context for image conversion.');
  }

  // JPEG has no alpha channel — composite onto white instead of black.
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    throw new Error('Failed to convert the image. The file might be corrupt or in an unusual format.');
  }

  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    throw new Error('Failed to extract image data after conversion.');
  }
  return { base64, mimeType: 'image/jpeg', previewUrl: dataUrl };
};

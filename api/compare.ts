import type { ApiRequest, ApiResponse } from './_types';
import { runLabelComparison } from '../shared/labelAnalysis';
import { CompareRequest } from '../shared/analysisTypes';

const isValidImage = (image: unknown): boolean => {
  if (typeof image !== 'object' || image === null) return false;
  const { base64, mimeType } = image as Record<string, unknown>;
  return typeof base64 === 'string' && base64.length > 0 && typeof mimeType === 'string' && mimeType.startsWith('image/');
};

const isValidImageList = (images: unknown): images is CompareRequest['currentImages'] =>
  Array.isArray(images) && images.length > 0 && images.every(isValidImage);

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: 'The server has no Gemini API key configured. Add your own key via the Settings menu instead.' });
    return;
  }

  const body = req.body as Partial<CompareRequest> | undefined;
  if (!body || !isValidImageList(body.currentImages) || !isValidImageList(body.proposedImages)) {
    res.status(400).json({ error: 'Request must include both current and proposed label images.' });
    return;
  }
  if (!body.beverageCategory) {
    res.status(400).json({ error: 'Request must include beverageCategory.' });
    return;
  }

  try {
    const report = await runLabelComparison(apiKey, body as CompareRequest);
    res.status(200).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Comparison failed.';
    res.status(502).json({ error: message });
  }
}

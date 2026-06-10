// NOTE: runtime-relative imports use explicit .ts extensions — Vercel's Node
// runtime executes these files natively (type stripping, no bundler), so
// specifiers must resolve to real files.
import type { ApiRequest, ApiResponse } from './_types.ts';
import { runLabelAnalysis } from '../shared/labelAnalysis.ts';
import type { AnalyzeRequest } from '../shared/analysisTypes.ts';

const isValidImage = (image: unknown): boolean => {
  if (typeof image !== 'object' || image === null) return false;
  const { base64, mimeType } = image as Record<string, unknown>;
  return typeof base64 === 'string' && base64.length > 0 && typeof mimeType === 'string' && mimeType.startsWith('image/');
};

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

  const body = req.body as Partial<AnalyzeRequest> | undefined;
  if (!body || !Array.isArray(body.images) || body.images.length === 0 || !body.images.every(isValidImage)) {
    res.status(400).json({ error: 'Request must include at least one label image.' });
    return;
  }
  if (!body.beverageCategory || !body.productRequirements) {
    res.status(400).json({ error: 'Request must include beverageCategory and productRequirements.' });
    return;
  }

  try {
    const report = await runLabelAnalysis(apiKey, body as AnalyzeRequest);
    res.status(200).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed.';
    res.status(502).json({ error: message });
  }
}

// NOTE: Vercel's Node builder compiles each file here to ESM .js without
// rewriting import specifiers, so relative imports must use .js (the compiled
// filenames); tsc's bundler resolution maps them back to the .ts sources.
import type { ApiRequest, ApiResponse } from './_types.js';
import { runLabelVerification } from '../shared/labelAnalysis.js';
import type { VerifyRequest, ApplicationData } from '../shared/analysisTypes.js';

const isValidImage = (image: unknown): boolean => {
  if (typeof image !== 'object' || image === null) return false;
  const { base64, mimeType } = image as Record<string, unknown>;
  return typeof base64 === 'string' && base64.length > 0 && typeof mimeType === 'string' && mimeType.startsWith('image/');
};

const hasRequiredApplicationFields = (app: unknown): app is ApplicationData => {
  if (typeof app !== 'object' || app === null) return false;
  const { brandName, classType, alcoholContent, netContents } = app as Record<string, unknown>;
  return [brandName, classType, alcoholContent, netContents].every(
    v => typeof v === 'string' && v.trim().length > 0
  );
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

  const body = req.body as Partial<VerifyRequest> | undefined;
  if (!body || !Array.isArray(body.images) || body.images.length === 0 || !body.images.every(isValidImage)) {
    res.status(400).json({ error: 'Request must include a label image.' });
    return;
  }
  if (!hasRequiredApplicationFields(body.application)) {
    res.status(400).json({ error: 'Application data must include brand name, class/type, alcohol content, and net contents.' });
    return;
  }
  if (!body.beverageCategory) {
    res.status(400).json({ error: 'Request must include beverageCategory.' });
    return;
  }
  if (body.labelType !== undefined && !['front', 'back', 'neck'].includes(body.labelType)) {
    res.status(400).json({ error: 'labelType must be "front", "back", or "neck".' });
    return;
  }

  try {
    const report = await runLabelVerification(apiKey, body as VerifyRequest);
    res.status(200).json(report);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed.';
    res.status(502).json({ error: message });
  }
}

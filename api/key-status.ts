import type { ApiRequest, ApiResponse } from './_types';
import { testGeminiConnection } from '../shared/labelAnalysis';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(200).json({ configured: false });
    return;
  }

  // ?test=1 performs a real (tiny) Gemini call — only on explicit request,
  // never on page load, so it stays a user-initiated cost.
  if (req.query.test === '1') {
    const live = await testGeminiConnection(apiKey);
    res.status(200).json({ configured: true, live });
    return;
  }

  res.status(200).json({ configured: true });
}

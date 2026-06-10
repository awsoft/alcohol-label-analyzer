// Browser-side entry points for label analysis.
//
// Key resolution order:
// 1. A key the user saved via Settings (localStorage) — calls Gemini directly
//    from the browser with the user's own key.
// 2. Otherwise — calls this app's serverless endpoints (/api/*), which hold
//    the key server-side so it is never shipped to the browser.

import {
  runLabelAnalysis,
  runLabelComparison,
  runLabelVerification,
  testGeminiConnection,
} from '../shared/labelAnalysis';
import {
  AnalyzeRequest,
  CompareRequest,
  VerifyRequest,
  AnalysisReport,
  ComparisonReport,
  VerificationReport,
} from '../shared/analysisTypes';

const STORAGE_KEY = 'alcohol-label-analyzer-api-key';

// Vercel serverless functions reject request bodies over ~4.5 MB.
const MAX_PROXY_PAYLOAD_BYTES = 4_200_000;

export const getLocalApiKey = (): string | null => localStorage.getItem(STORAGE_KEY);

export type ApiKeySource = 'local' | 'server' | 'none';

export interface ApiKeyStatus {
  isConfigured: boolean;
  source: ApiKeySource;
}

const isServerKeyConfigured = async (): Promise<boolean> => {
  try {
    const res = await fetch('/api/key-status');
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return false;
    const data = await res.json();
    return data.configured === true;
  } catch {
    return false;
  }
};

export const getApiKeyStatus = async (): Promise<ApiKeyStatus> => {
  if (getLocalApiKey()) {
    return { isConfigured: true, source: 'local' };
  }
  if (await isServerKeyConfigured()) {
    return { isConfigured: true, source: 'server' };
  }
  return { isConfigured: false, source: 'none' };
};

/** Live connectivity test. Costs one tiny Gemini call — keep it user-initiated. */
export const testApiConnection = async (): Promise<boolean> => {
  const localKey = getLocalApiKey();
  if (localKey) {
    return testGeminiConnection(localKey);
  }
  try {
    const res = await fetch('/api/key-status?test=1');
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return false;
    const data = await res.json();
    return data.configured === true && data.live === true;
  } catch {
    return false;
  }
};

const postToApi = async <T>(path: string, payload: unknown): Promise<T> => {
  const body = JSON.stringify(payload);
  if (body.length > MAX_PROXY_PAYLOAD_BYTES) {
    throw new Error(
      'The combined images are too large to send (over ~4 MB). Use fewer or smaller images, or add your own Gemini API key in Settings to lift this limit.'
    );
  }

  let res: Response;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
  } catch {
    throw new Error('Could not reach the analysis service. Check your connection and try again.');
  }

  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) {
    // Local `vite dev`/`vite preview` have no /api routes and fall back to index.html.
    throw new Error(
      'The analysis endpoints are not available in this environment. Add your own Gemini API key via the Settings menu, or run the app with `vercel dev`.'
    );
  }

  const data = await res.json();
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Request failed with status ${res.status}.`);
  }
  return data as T;
};

export const analyzeLabels = async (request: AnalyzeRequest): Promise<AnalysisReport> => {
  const localKey = getLocalApiKey();
  if (localKey) {
    return runLabelAnalysis(localKey, request);
  }
  return postToApi<AnalysisReport>('/api/analyze', request);
};

export const compareLabels = async (request: CompareRequest): Promise<ComparisonReport> => {
  const localKey = getLocalApiKey();
  if (localKey) {
    return runLabelComparison(localKey, request);
  }
  return postToApi<ComparisonReport>('/api/compare', request);
};

export const verifyLabel = async (request: VerifyRequest): Promise<VerificationReport> => {
  const localKey = getLocalApiKey();
  if (localKey) {
    return runLabelVerification(localKey, request);
  }
  return postToApi<VerificationReport>('/api/verify', request);
};

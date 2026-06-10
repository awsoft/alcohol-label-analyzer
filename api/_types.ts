// Minimal structural types for Vercel Node serverless handlers.
// (Files in /api starting with an underscore are not deployed as endpoints.)
// Using these instead of the @vercel/node package keeps the dev dependency
// tree small; the real runtime objects satisfy these shapes.

export interface ApiRequest {
  method?: string;
  query: Partial<Record<string, string | string[]>>;
  /** Parsed JSON body (Vercel parses application/json automatically). */
  body?: unknown;
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(value: unknown): void;
}

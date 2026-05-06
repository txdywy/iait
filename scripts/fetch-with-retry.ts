/**
 * Configuration options for fetchWithRetry.
 */
export interface FetchOptions {
  /** Maximum number of retry attempts (default: 3) */
  retries?: number;
  /** Base delay in milliseconds for exponential backoff (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in milliseconds (default: 30000) */
  maxDelayMs?: number;
  /** Per-request timeout in milliseconds (default: 30000) */
  timeoutMs?: number;
}

/**
 * HTTP fetch wrapper with retry on transient failures.
 *
 * - Retries on HTTP 429 (rate limit) and 5xx (server errors) with exponential backoff + jitter
 * - Throws immediately on HTTP 4xx (except 429) without retrying
 * - Uses AbortController for per-request timeout
 * - Clears timers on success and error to prevent leaks
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit = {},
  opts: FetchOptions = {},
): Promise<Response> {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 30000, timeoutMs = 30000 } = opts;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    let gotResponse = false;
    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      gotResponse = true;

      if (response.ok) return response;

      // Retry on 429 (rate limit) and 5xx (server errors)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < retries) {
          const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
          const jitter = delay * (0.75 + Math.random() * 0.5);
          console.warn(`[retry] ${response.status} on ${url}, attempt ${attempt + 1}/${retries}, waiting ${Math.round(jitter)}ms`);
          await new Promise(r => setTimeout(r, jitter));
          continue;
        }
      }

      // Non-retryable HTTP error (4xx except 429) -- throw immediately
      throw new Error(`HTTP ${response.status}: ${response.statusText} for ${url}`);
    } catch (err) {
      clearTimeout(timer);
      // If we got a response (HTTP error), never retry
      if (gotResponse) throw err;
      if (attempt === retries) throw err;

      const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      const jitter = delay * (0.75 + Math.random() * 0.5);
      console.warn(`[retry] Error on ${url}, attempt ${attempt + 1}/${retries}, waiting ${Math.round(jitter)}ms`);
      await new Promise(r => setTimeout(r, jitter));
    }
  }

  throw new Error(`Exhausted retries for ${url}`);
}

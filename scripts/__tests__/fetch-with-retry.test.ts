import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchWithRetry } from '../fetch-with-retry.js';

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns response on first successful attempt', async () => {
    const mockResponse = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));

    const response = await fetchWithRetry('https://example.com');
    expect(response.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('retries on 500 status and eventually succeeds', async () => {
    const failResponse = { ok: false, status: 500, statusText: 'Internal Server Error' } as Response;
    const successResponse = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(failResponse)
      .mockResolvedValueOnce(successResponse));

    const response = await fetchWithRetry('https://example.com', {}, { retries: 3, baseDelayMs: 1, maxDelayMs: 10 });
    expect(response.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('retries on 429 rate limit', async () => {
    const rateLimitResponse = { ok: false, status: 429, statusText: 'Too Many Requests' } as Response;
    const successResponse = { ok: true, status: 200 } as Response;
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse));

    const response = await fetchWithRetry('https://example.com', {}, { retries: 3, baseDelayMs: 1, maxDelayMs: 10 });
    expect(response.ok).toBe(true);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('throws on 400 non-retryable error', async () => {
    const badRequestResponse = { ok: false, status: 400, statusText: 'Bad Request' } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(badRequestResponse));

    await expect(fetchWithRetry('https://example.com', {}, { retries: 3, baseDelayMs: 1 }))
      .rejects.toThrow('HTTP 400');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('throws after exhausting retries', async () => {
    const failResponse = { ok: false, status: 500, statusText: 'Server Error' } as Response;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(failResponse));

    await expect(fetchWithRetry('https://example.com', {}, { retries: 2, baseDelayMs: 1, maxDelayMs: 10 }))
      .rejects.toThrow('HTTP 500');
    expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('aborts on timeout', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    }));

    await expect(fetchWithRetry('https://example.com', {}, { retries: 0, timeoutMs: 50, baseDelayMs: 1 }))
      .rejects.toThrow();
  }, 10000);
});

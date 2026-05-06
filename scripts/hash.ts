import { createHash } from 'node:crypto';
import type { NormalizedRecord } from './types.js';

/**
 * Compute SHA-256 hash of normalized records array.
 * Sorts by timestamp first for deterministic output regardless of input order.
 */
export function hashRecords(records: NormalizedRecord[]): string {
  const sorted = [...records].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const payload = JSON.stringify(sorted);
  return createHash('sha256').update(payload).digest('hex');
}

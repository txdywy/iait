import { createHash } from 'node:crypto';
import type { NormalizedRecord } from './types.js';

/**
 * Compute SHA-256 hash of normalized records array.
 * Sorts by timestamp first for deterministic output regardless of input order.
 */
export function hashRecords(records: NormalizedRecord[]): string {
  const sorted = [...records].sort((a, b) => {
    const keyA = [a.timestamp, a.source, a.entity.id, a.entity.type, a.metric, a.unit, String(a.value), String(a.confidence)];
    const keyB = [b.timestamp, b.source, b.entity.id, b.entity.type, b.metric, b.unit, String(b.value), String(b.confidence)];
    return keyA.join('\0').localeCompare(keyB.join('\0'));
  });
  const payload = JSON.stringify(sorted);
  return createHash('sha256').update(payload).digest('hex');
}

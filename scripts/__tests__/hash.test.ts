import { describe, it, expect } from 'vitest';
import { hashRecords } from '../hash.js';
import type { NormalizedRecord } from '../types.js';

const makeRecord = (ts: string, value = 1.0, metric = 'gpu-price-hr'): NormalizedRecord => ({
  source: 'test',
  entity: { id: 'test-1', type: 'cloud-region' as any, name: 'Test' },
  metric,
  value,
  unit: 'USD/hr',
  timestamp: ts,
  confidence: 5,
});

describe('hashRecords', () => {
  it('produces same hash regardless of input order', () => {
    const a = [makeRecord('2026-01-01T00:00:00Z'), makeRecord('2026-01-02T00:00:00Z')];
    const b = [makeRecord('2026-01-02T00:00:00Z'), makeRecord('2026-01-01T00:00:00Z')];
    expect(hashRecords(a)).toBe(hashRecords(b));
  });

  it('produces same hash for same-timestamp records regardless of input order', () => {
    const first = makeRecord('2026-01-01T00:00:00Z', 1, 'gpu-price-hr');
    const second = makeRecord('2026-01-01T00:00:00Z', 2, 'electricity-price-mwh');

    expect(hashRecords([first, second])).toBe(hashRecords([second, first]));
  });

  it('produces different hash when data changes', () => {
    const a = [makeRecord('2026-01-01T00:00:00Z', 1.0)];
    const b = [makeRecord('2026-01-01T00:00:00Z', 2.0)];
    expect(hashRecords(a)).not.toBe(hashRecords(b));
  });

  it('produces hex string of length 64', () => {
    const hash = hashRecords([makeRecord('2026-01-01T00:00:00Z')]);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

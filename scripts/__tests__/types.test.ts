import { describe, it, expect } from 'vitest';
import { EntityType, DataSourceLayer } from '../types.js';
import type { NormalizedRecord, Scraper, EntityFile, PipelineMeta, CompiledEntity } from '../types.js';

describe('Type definitions', () => {
  it('NormalizedRecord has all required fields', () => {
    const record: NormalizedRecord = {
      source: 'test',
      entity: { id: 'test-1', type: EntityType.CLOUD_REGION, name: 'Test' },
      metric: 'gpu-price-hr',
      value: 1.0,
      unit: 'USD/hr',
      timestamp: '2026-01-01T00:00:00Z',
      confidence: 5,
    };
    expect(record.source).toBe('test');
    expect(record.entity.type).toBe(EntityType.CLOUD_REGION);
    expect(record.confidence).toBeGreaterThanOrEqual(1);
    expect(record.confidence).toBeLessThanOrEqual(5);
  });

  it('EntityType has all 4 values', () => {
    expect(EntityType.COUNTRY).toBe('country');
    expect(EntityType.CITY).toBe('city');
    expect(EntityType.CLOUD_REGION).toBe('cloud-region');
    expect(EntityType.COMPANY).toBe('company');
  });

  it('DataSourceLayer has all 4 values', () => {
    expect(DataSourceLayer.STRUCTURED_API).toBe('structured_api');
    expect(DataSourceLayer.RSS_RULES).toBe('rss_rules');
    expect(DataSourceLayer.LLM_EXTRACTION).toBe('llm_extraction');
    expect(DataSourceLayer.MANUAL).toBe('manual');
  });
});

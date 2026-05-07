import { describe, expect, it, vi } from 'vitest';
import { dataUrl, fetchStaticJson } from './static-json';
import { queryKeys } from './queries';
import { EntityType } from './types';
import type { DerivedClusterNode, EntityLevel } from './types';

vi.stubEnv('BASE_URL', '/iait/');

describe('static JSON helpers', () => {
  it('prefixes paths with the Vite base URL without double slashes', () => {
    expect(dataUrl('data/latest.json')).toBe('/iait/data/latest.json');
    expect(dataUrl('/data/latest.json')).toBe('/iait/data/latest.json');
  });

  it('resolves parsed JSON for successful static fetches', async () => {
    const payload = { generated: '2026-05-07T00:00:00Z', entities: {} };
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => payload,
    })));

    await expect(fetchStaticJson('data/latest.json')).resolves.toEqual(payload);
    expect(fetch).toHaveBeenCalledWith('/iait/data/latest.json');
  });

  it('rejects with a descriptive path and status for missing assets', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 404,
      json: async () => ({}),
    })));

    await expect(fetchStaticJson('data/missing.json')).rejects.toThrow(
      'Failed to load data/missing.json: 404',
    );
  });

  it('exports query keys for all public static data paths', () => {
    expect(queryKeys.latest).toEqual(['data', 'data/latest.json']);
    expect(queryKeys.rankings).toEqual(['data', 'data/rankings.json']);
    expect(queryKeys.history).toEqual(['data', 'data/history.json']);
    expect(queryKeys.indexConfig).toEqual(['data', 'data/index-config.json']);
    expect(queryKeys.crossRef).toEqual(['data', 'data/entity-crossref.json']);
    expect(queryKeys.countryGeometry).toEqual(['data', 'data/geo/countries-110m.json']);
    expect(queryKeys.entitySourceSummary(EntityType.CLOUD_REGION, 'aws-us-east-1')).toEqual([
      'data',
      'data/entities/cloud-region/aws-us-east-1.json',
    ]);
  });
});

describe('frontend data contracts', () => {
  it('accepts data-center-cluster as a routable entity level', () => {
    const levels = [
      EntityType.COUNTRY,
      EntityType.CITY,
      EntityType.CLOUD_REGION,
      EntityType.COMPANY,
      'data-center-cluster',
    ] satisfies EntityLevel[];

    expect(levels).toContain('data-center-cluster');
  });

  it('requires derived cluster parent and location fields', () => {
    const cluster = {
      id: 'aws-us-east-1-cluster',
      level: 'data-center-cluster',
      parentCloudRegionId: 'aws-us-east-1',
      provider: 'aws',
      country: 'us',
      city: 'northern-virginia',
      label: 'AWS Northern Virginia data center cluster',
      description: 'Modeled cluster proxy derived from cloud region metadata, not a verified facility.',
    } satisfies DerivedClusterNode;

    expect(cluster.parentCloudRegionId).toBe('aws-us-east-1');
    expect(cluster.provider).toBe('aws');
    expect(cluster.country).toBe('us');
    expect(cluster.city).toBe('northern-virginia');
    expect(cluster.label).toContain('data center cluster');
    expect(cluster.description).toContain('not a verified facility');
  });
});

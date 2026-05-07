import { describe, expect, it } from 'vitest';
import type { DerivedClusterNode, EntityLevel } from './types';

describe('frontend data contracts', () => {
  it('accepts data-center-cluster as a routable entity level', () => {
    const levels = [
      'country',
      'city',
      'cloud-region',
      'company',
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

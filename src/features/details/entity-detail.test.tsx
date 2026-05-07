import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import EntityDetailRoute from './EntityDetailRoute';

const latest = {
  generated: '2026-05-07T10:00:00.000Z',
  entities: {
    us: {
      type: 'country',
      name: 'United States',
      score: 88.24,
      factors: { gpu_supply: 7.2 },
      confidence: 4,
      lastUpdated: '2026-05-07T09:30:00.000Z',
      riskTier: 'unrestricted',
      riskMultiplier: 1,
      factorBreakdown: {
        gpu_supply: { raw: 7.2, normalized: 91.5, weight: 0.3 },
      },
      dataCompleteness: 'full',
    },
    sparse: {
      type: 'country',
      name: 'Sparse Signal',
      score: 12.3,
      factors: {},
      confidence: 2,
      lastUpdated: '2026-05-06T09:30:00.000Z',
      riskTier: 'watch',
      riskMultiplier: 0.9,
      dataCompleteness: 'partial',
    },
    'aws-us-east-1': {
      type: 'cloud-region',
      name: 'US East (N. Virginia)',
      score: 40.8,
      factors: { gpu_supply: 4.9 },
      confidence: 1,
      lastUpdated: '2026-05-07T09:30:00.000Z',
      riskTier: 'unrestricted',
      riskMultiplier: 1,
      dataCompleteness: 'partial',
    },
  },
};

const config = {
  version: 1,
  factors: {
    gpu_supply: { weight: 0.3, description: 'GPU pricing density' },
    energy_capacity: { weight: 0.2, description: 'Energy capacity' },
  },
  confidence: {
    staleDays: 30,
    stalePenalty: 1,
    veryStaleDays: 90,
    veryStalePenalty: 2,
    missingFactorPenalty: 1,
    minConfidence: 1,
  },
};

const history = {
  us: {
    type: 'country',
    name: 'United States',
    series: [{ timestamp: '2026-05-07T09:30:00.000Z', score: 88.24, factors: { gpu_supply: 7.2 } }],
  },
};

const crossRef = {
  countries: { us: { iso2: 'US', iso3: 'USA', worldBankCode: 'USA', owidName: 'United States', name: 'United States' } },
  cities: { ashburn: { country: 'us', name: 'Ashburn, VA' } },
  companies: {},
  cloudRegions: { 'aws-us-east-1': { country: 'us', city: 'ashburn', provider: 'aws' } },
};

const entityFile = {
  id: 'us',
  type: 'country',
  latest: {
    source: 'aws-pricing',
    entity: { id: 'us', type: 'country', name: 'United States' },
    metric: 'gpu_supply',
    value: 7.2,
    unit: 'index',
    timestamp: '2026-05-07T09:30:00.000Z',
    confidence: 4,
  },
  series: [
    {
      source: 'aws-pricing',
      entity: { id: 'us', type: 'country', name: 'United States' },
      metric: 'gpu_supply',
      value: 7.2,
      unit: 'index',
      timestamp: '2026-05-07T09:30:00.000Z',
      confidence: 4,
    },
  ],
  _hash: 'fixture',
  _updatedAt: '2026-05-07T09:30:00.000Z',
};

function route(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/entity/:type/:id" element={<EntityDetailRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function jsonResponse(data: unknown) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200 }));
}

describe('EntityDetailRoute', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('data/latest.json')) return jsonResponse(latest);
      if (url.endsWith('data/index-config.json')) return jsonResponse(config);
      if (url.endsWith('data/history.json')) return jsonResponse(history);
      if (url.endsWith('data/entity-crossref.json')) return jsonResponse(crossRef);
      if (url.endsWith('data/entities/country/us.json')) return jsonResponse(entityFile);
      if (url.includes('data/entities/data-center-cluster')) throw new Error('cluster entity file should not be fetched');
      return Promise.resolve(new Response('{}', { status: 404 }));
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('renders real entity detail score, confidence, completeness, freshness, and risk context', async () => {
    route('/entity/country/us');

    expect(await screen.findByText('United States')).toBeInTheDocument();
    expect(screen.getByText('88.2')).toBeInTheDocument();
    expect(screen.getByText('Confidence 4/5')).toBeInTheDocument();
    expect(screen.getByText('Full factors')).toBeInTheDocument();
    expect(screen.getByText(/Updated|Stale/)).toBeInTheDocument();
    expect(screen.getAllByText(/Risk adjustment/i).length).toBeGreaterThan(0);
  });

  it('renders factor breakdown headings', async () => {
    route('/entity/country/us');

    expect(await screen.findByText('Raw value')).toBeInTheDocument();
    expect(screen.getByText('Normalized score')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('Contribution')).toBeInTheDocument();
  });

  it('frames risk as a modeling assumption without verdict language', async () => {
    route('/entity/country/us');

    expect((await screen.findAllByText(/Modeling assumption/i)).length).toBeGreaterThan(0);
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/legal risk|compliance verdict|sanctioned/i);
  });

  it('keeps the detail usable when factor breakdown is missing', async () => {
    route('/entity/country/sparse');

    expect(await screen.findByText('Sparse Signal')).toBeInTheDocument();
    expect(screen.getAllByText('Factor unavailable').length).toBeGreaterThan(0);
    expect(screen.getByText('Return to map')).toBeInTheDocument();
  });

  it('renders actual normalized record source identifiers', async () => {
    route('/entity/country/us');

    expect(await screen.findByText('aws-pricing')).toBeInTheDocument();
  });

  it('renders derived cluster proxy details from crossref only', async () => {
    route('/entity/data-center-cluster/aws-us-east-1-cluster');

    expect(await screen.findByText('AWS ashburn data center cluster')).toBeInTheDocument();
    expect(screen.getByText(/Parent cloud region/)).toHaveTextContent('aws-us-east-1');
    expect(screen.getByText(/Provider/)).toHaveTextContent('aws');
    expect(screen.getByText(/Country/)).toHaveTextContent('us');
    expect(screen.getByText(/City/)).toHaveTextContent('ashburn');
    expect(screen.getByText(/modeled cluster proxy/)).toBeInTheDocument();
    expect(screen.getByText(/not a verified facility/)).toBeInTheDocument();
  });

  it('does not fetch latest cluster entities or per-cluster files', async () => {
    route('/entity/data-center-cluster/aws-us-east-1-cluster');

    await screen.findByText('AWS ashburn data center cluster');
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => String(input));
    expect(calls.some((url) => url.includes('data/entities/data-center-cluster'))).toBe(false);
  });

  it('does not crash on malformed encoded route ids', async () => {
    expect(() => route('/entity/country/%E0%A4%A')).not.toThrow();

    expect(await screen.findByText('No compute signals found')).toBeInTheDocument();
  });

  it('includes a return affordance to the map', async () => {
    route('/entity/country/us');

    expect(await screen.findByText('Return to map')).toBeInTheDocument();
  });
});

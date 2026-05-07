import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RankingRail } from './RankingRail';
import { queryKeys } from '../../data/queries';
import { EntityType } from '../../data/types';
import type { LatestIndex, RankingsIndex } from '../../data/types';

const rankings: RankingsIndex = {
  generated: new Date().toISOString(),
  byType: {
    countries: [
      { rank: 2, entityId: 'country-low-confidence', score: 41.1, confidence: 1 },
      { rank: 1, entityId: 'country-high', score: 88.4, confidence: 4 },
    ],
    cities: [
      { rank: 2, entityId: 'city-low', score: 39.4, confidence: 2 },
      { rank: 1, entityId: 'city-high', score: 72.9, confidence: 5 },
    ],
    cloudRegions: [
      { rank: 1, entityId: 'cloud-a', score: 91.2, confidence: 3 },
    ],
    companies: [],
  },
};

const latest: LatestIndex = {
  generated: new Date().toISOString(),
  entities: {
    'country-high': {
      type: EntityType.COUNTRY,
      name: 'United States',
      score: 88.4,
      factors: {},
      confidence: 4,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 'full',
    },
    'country-low-confidence': {
      type: EntityType.COUNTRY,
      name: 'Sparse Country',
      score: 41.1,
      factors: {},
      confidence: 1,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 'partial',
    },
    'city-high': {
      type: EntityType.CITY,
      name: 'Northern Virginia',
      score: 72.9,
      factors: {},
      confidence: 5,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 'full',
    },
    'city-low': {
      type: EntityType.CITY,
      name: 'Sparse City',
      score: 39.4,
      factors: {},
      confidence: 2,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 'partial',
    },
    'cloud-a': {
      type: EntityType.CLOUD_REGION,
      name: 'AWS us-east-1',
      score: 91.2,
      factors: {},
      confidence: 3,
      lastUpdated: new Date().toISOString(),
      dataCompleteness: 'partial',
    },
  },
};

function renderRankingRail(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  queryClient.setQueryData(queryKeys.rankings, rankings);
  queryClient.setQueryData(queryKeys.latest, latest);

  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('RankingRail', () => {
  it('renders first-class scope controls for countries, cities, and cloud regions', () => {
    renderRankingRail(<RankingRail />);

    expect(screen.getByRole('button', { name: 'Countries' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cities' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cloud Regions' })).toBeInTheDocument();
  });

  it('sorts rows by descending score and preserves low-confidence entries', () => {
    renderRankingRail(<RankingRail />);
    const rows = screen.getAllByRole('button', { name: /Select / });

    expect(within(rows[0]).getByText('United States')).toBeInTheDocument();
    expect(within(rows[1]).getByText('Sparse Country')).toBeInTheDocument();
    expect(screen.getByText('Confidence 1/5')).toBeInTheDocument();
  });

  it('renders rank, entity name, one-decimal score, confidence, completeness, and freshness', () => {
    renderRankingRail(<RankingRail />);

    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.getByText('United States')).toBeInTheDocument();
    expect(screen.getByText('88.4')).toBeInTheDocument();
    expect(screen.getByText('Confidence 4/5')).toBeInTheDocument();
    expect(screen.getByText('Full factors')).toBeInTheDocument();
    expect(screen.getAllByText('Updated today').length).toBeGreaterThan(0);
  });

  it('selecting rows calls onSelect with the active entity type and id', () => {
    const onSelect = vi.fn();
    renderRankingRail(<RankingRail onSelect={onSelect} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cities' }));
    fireEvent.click(screen.getByRole('button', { name: /Select Northern Virginia/ }));
    expect(onSelect).toHaveBeenCalledWith(EntityType.CITY, 'city-high');

    fireEvent.click(screen.getByRole('button', { name: 'Cloud Regions' }));
    fireEvent.click(screen.getByRole('button', { name: /Select AWS us-east-1/ }));
    expect(onSelect).toHaveBeenCalledWith(EntityType.CLOUD_REGION, 'cloud-a');

    fireEvent.click(screen.getByRole('button', { name: 'Countries' }));
    fireEvent.click(screen.getByRole('button', { name: /Select United States/ }));
    expect(onSelect).toHaveBeenCalledWith(EntityType.COUNTRY, 'country-high');
  });
});

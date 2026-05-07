import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import routerSource from './router.tsx?raw';
import { AppRouter } from './router';

vi.mock('../features/map/ComputeMap', () => ({
  ComputeMap: () => <div data-testid="map-shell">MapLibre compute map</div>,
}));

vi.mock('../features/rankings/RankingRail', () => ({
  RankingRail: () => <nav aria-label="Ranking rail">RankingRail</nav>,
}));

vi.mock('../features/details/EntityDetailRoute', () => ({
  default: () => <section aria-label="Entity detail rail">Loading detail route panel</section>,
}));

describe('AppRouter', () => {
  beforeEach(() => {
    window.location.hash = '#/';
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('uses HashRouter and not BrowserRouter for static hosting', () => {
    expect(routerSource).toContain('HashRouter');
    expect(routerSource).not.toContain('BrowserRouter');
  });

  it('renders the map-first App shell at the root route', () => {
    render(<AppRouter />);

    expect(screen.getByText('ComputeAtlas')).toBeInTheDocument();
    expect(screen.getByTestId('map-shell')).toBeInTheDocument();
    expect(screen.getByLabelText('Ranking rail')).toBeInTheDocument();
  });

  it('keeps the persistent shell mounted for country detail routes with a lazy detail fallback', async () => {
    window.location.hash = '#/entity/country/us';

    render(<AppRouter />);

    expect(screen.getByTestId('map-shell')).toBeInTheDocument();
    expect(screen.getByLabelText('Ranking rail')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Loading detail/i)).toBeInTheDocument());
  });

  it('accepts derived data-center-cluster detail routes while preserving the shell', async () => {
    window.location.hash = '#/entity/data-center-cluster/aws-us-east-1-cluster';

    render(<AppRouter />);

    expect(screen.getByTestId('map-shell')).toBeInTheDocument();
    expect(screen.getByLabelText('Ranking rail')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Loading detail/i)).toBeInTheDocument());
  });

  it('does not eagerly import ECharts from the route module', () => {
    expect(routerSource).not.toMatch(/echarts|echarts-for-react/i);
  });
});

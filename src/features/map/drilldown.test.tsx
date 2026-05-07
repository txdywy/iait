import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityType } from '../../data/types';
import type { EntityCrossRef, LatestIndex } from '../../data/types';
import { useExplorerStore } from '../../store/explorer-store';
import { ComputeMap } from './ComputeMap';
import {
  childrenForSelection,
  companyOverlays,
  deriveClusterNodes,
  resolveClusterDetail,
} from './drilldown';

const crossRef: EntityCrossRef = {
  countries: {
    us: { iso2: 'US', iso3: 'USA', worldBankCode: 'USA', owidName: 'United States', name: 'United States' },
    ie: { iso2: 'IE', iso3: 'IRL', worldBankCode: 'IRL', owidName: 'Ireland', name: 'Ireland' },
  },
  cloudRegions: {
    'aws-us-east-1': { country: 'us', city: 'ashburn', provider: 'aws' },
    'azure-eastus': { country: 'us', city: 'ashburn', provider: 'azure' },
    'aws-eu-west-1': { country: 'ie', city: 'dublin', provider: 'aws' },
  },
  cities: {
    ashburn: { country: 'us', name: 'Ashburn, VA' },
    dublin: { country: 'ie', name: 'Dublin' },
  },
  companies: {
    nvidia: { cik: '0001045810', country: 'us', name: 'NVIDIA' },
    amazon: { cik: '0001018724', country: 'us', name: 'Amazon' },
  },
};

const latest: LatestIndex = {
  generated: '2026-05-07T00:00:00Z',
  entities: {
    us: {
      type: EntityType.COUNTRY,
      name: 'United States',
      score: 87,
      factors: {},
      confidence: 4,
      lastUpdated: '2026-05-07T00:00:00Z',
      dataCompleteness: 'partial',
    },
  },
};

declare global {
  var __computeMapEvents: string[] | undefined;
}

const countryGeometry = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { ISO_A2: 'US', ISO_A3: 'USA', name: 'United States' },
      geometry: { type: 'Polygon' as const, coordinates: [] },
    },
  ],
};

vi.mock('react-map-gl/maplibre', async () => {
  const React = await import('react');

  return {
    default: React.forwardRef(function MockMap(
      { children, onClick, interactiveLayerIds }: { children: React.ReactNode; onClick?: (event: unknown) => void; interactiveLayerIds?: string[] },
      ref: React.ForwardedRef<{ flyTo: (options: unknown) => void }>,
    ) {
      React.useImperativeHandle(ref, () => ({ flyTo: vi.fn(() => globalThis.__computeMapEvents?.push('camera')) }));
      return (
        <div data-testid="mock-map" data-interactive-layer-ids={interactiveLayerIds?.join(',')}>
          <button
            type="button"
            onClick={() => onClick?.({ features: [{ properties: { computeAtlasId: 'us' } }] })}
          >
            mock country click
          </button>
          {children}
        </div>
      );
    }),
    Source: ({ id, children }: { id: string; children: React.ReactNode }) => <div data-source-id={id}>{children}</div>,
    Layer: ({ id }: { id: string }) => <div data-layer-id={id} />,
    Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-marker">{children}</div>,
  };
});

vi.mock('maplibre-gl/dist/maplibre-gl.css', () => ({}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

beforeEach(() => {
  useExplorerStore.setState({
    level: EntityType.COUNTRY,
    selectedId: null,
    hoveredId: null,
    rankingScope: EntityType.COUNTRY,
    viewportIntent: { type: 'global' },
  });
  window.location.hash = '';
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('data/latest.json')) return Response.json(latest);
    if (url.endsWith('data/entity-crossref.json')) return Response.json(crossRef);
    if (url.endsWith('data/geo/countries-110m.json')) return Response.json(countryGeometry);
    return new Response(null, { status: 404 });
  }) as typeof fetch;
});

function renderComputeMap() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <ComputeMap />
    </QueryClientProvider>,
  );
}

describe('drill-down hierarchy helpers', () => {
  it('returns city and cloud-region children for a selected country', () => {
    const children = childrenForSelection(EntityType.COUNTRY, 'us', crossRef, latest);

    expect(children.some((child) => child.level === EntityType.CITY && child.id === 'ashburn')).toBe(true);
    expect(children.some((child) => child.level === EntityType.CLOUD_REGION && child.id === 'aws-us-east-1')).toBe(true);
  });

  it('returns cloud-region children for a selected city', () => {
    const children = childrenForSelection(EntityType.CITY, 'ashburn', crossRef, latest);

    expect(children.map((child) => child.id)).toEqual(expect.arrayContaining(['aws-us-east-1', 'azure-eastus']));
    expect(children.every((child) => child.level === EntityType.CLOUD_REGION)).toBe(true);
  });

  it('derives a modeled data-center-cluster proxy for each cloud region', () => {
    const clusters = deriveClusterNodes(crossRef);
    const cluster = clusters.find((node) => node.id === 'aws-us-east-1-cluster');

    expect(cluster).toMatchObject({
      id: 'aws-us-east-1-cluster',
      level: 'data-center-cluster',
      parentCloudRegionId: 'aws-us-east-1',
      provider: 'aws',
      country: 'us',
      city: 'ashburn',
      label: 'AWS ashburn data center cluster',
    });
    expect(cluster?.description).toContain('modeled cluster proxy');
    expect(cluster?.description).toContain('not a verified facility');
  });

  it('returns a derived cluster child for a selected cloud region and resolves cluster details without latest entity files', () => {
    const children = childrenForSelection(EntityType.CLOUD_REGION, 'aws-us-east-1', crossRef, latest);
    const cluster = resolveClusterDetail('aws-us-east-1-cluster', crossRef);

    expect(children).toHaveLength(1);
    expect(children[0]).toMatchObject({ id: 'aws-us-east-1-cluster', level: 'data-center-cluster' });
    expect(cluster?.description).toContain('not a verified facility');
    expect(childrenForSelection('data-center-cluster', 'aws-us-east-1-cluster', crossRef, latest)).toEqual([]);
  });

  it('proves a user can select country, city, cloud-region, then a visible data-center-cluster proxy node', () => {
    const onSelect = vi.fn();

    function TestDrilldown() {
      const countryChildren = childrenForSelection(EntityType.COUNTRY, 'us', crossRef, latest);
      const cityChildren = childrenForSelection(EntityType.CITY, 'ashburn', crossRef, latest);
      const cloudChildren = childrenForSelection(EntityType.CLOUD_REGION, 'aws-us-east-1', crossRef, latest);

      return (
        <div>
          {countryChildren.map((child) => (
            <button key={child.id} type="button" onClick={() => onSelect(child.level, child.id)}>
              {child.label}
            </button>
          ))}
          {cityChildren.map((child) => (
            <button key={child.id} type="button" onClick={() => onSelect(child.level, child.id)}>
              {child.label}
            </button>
          ))}
          {cloudChildren.map((child) => (
            <button key={child.id} type="button" onClick={() => onSelect(child.level, child.id)}>
              {child.label} — {child.description}
            </button>
          ))}
        </div>
      );
    }

    render(<TestDrilldown />);

    fireEvent.click(screen.getByRole('button', { name: /Ashburn, VA/i }));
    fireEvent.click(screen.getAllByRole('button', { name: /aws-us-east-1/i })[0]);
    const clusterButton = screen.getByRole('button', { name: /AWS ashburn data center cluster/i });
    expect(clusterButton).toHaveTextContent('modeled cluster proxy');
    expect(clusterButton).toHaveTextContent('not a verified facility');

    fireEvent.click(clusterButton);
    expect(onSelect).toHaveBeenCalledWith('data-center-cluster', 'aws-us-east-1-cluster');
  });

  it('labels company overlays as corporate influence and not exact facility locations', () => {
    const overlays = companyOverlays(crossRef);
    const nvidia = overlays.find((overlay) => overlay.id === 'nvidia');

    expect(nvidia?.label).toContain('corporate compute influence');
    expect(nvidia?.description).toContain('AI CapEx signal');
    expect(nvidia?.description).toContain('not an exact facility location');
    expect(nvidia?.label).not.toContain('facility location');
  });
});

describe('ComputeMap MapLibre interaction shell', () => {
  it('renders MapLibre countries source and country-score-fill layer when data is available', async () => {
    renderComputeMap();

    expect(await screen.findByTestId('mock-map')).toHaveAttribute('data-interactive-layer-ids', 'country-score-fill');
    expect(document.querySelector('[data-source-id="countries"]')).toBeInTheDocument();
    expect(document.querySelector('[data-layer-id="country-score-fill"]')).toBeInTheDocument();
  });

  it('performs country click zoom-first camera intent before selected entity state is exposed', async () => {
    globalThis.__computeMapEvents = [];

    renderComputeMap();
    fireEvent.click(await screen.findByRole('button', { name: /mock country click/i }));

    expect(useExplorerStore.getState().viewportIntent).toEqual({ type: 'fit-country', id: 'us' });
    expect(useExplorerStore.getState().selectedId).toBe('us');
    expect(globalThis.__computeMapEvents).toEqual(['camera']);
  });

  it('shows selected country breadcrumb and city/cloud-region next-step labels', async () => {
    useExplorerStore.setState({ level: EntityType.COUNTRY, selectedId: 'us' });
    renderComputeMap();

    expect(await screen.findByText('Global / Country')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Ashburn, VA/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /aws-us-east-1/i })[0]).toBeInTheDocument();
  });

  it('exposes a visible selectable modeled cluster proxy for a selected cloud region', async () => {
    useExplorerStore.setState({ level: EntityType.CLOUD_REGION, selectedId: 'aws-us-east-1' });
    renderComputeMap();

    const clusterButtons = await screen.findAllByRole('button', { name: /modeled cluster proxy|AWS ashburn data center cluster/i });
    expect(clusterButtons.length).toBeGreaterThan(0);
    expect(screen.getByText(/not a verified facility/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /AWS ashburn data center cluster/i }));
    expect(useExplorerStore.getState().level).toBe('data-center-cluster');
    expect(useExplorerStore.getState().selectedId).toBe('aws-us-east-1-cluster');
  });

  it('renders symbolic company overlay copy without implying exact facilities', async () => {
    renderComputeMap();

    await waitFor(() => expect(screen.getAllByText(/AI CapEx signal/i).length).toBeGreaterThan(0));
    expect(screen.getAllByText(/not an exact facility location/i).length).toBeGreaterThan(0);
  });
});

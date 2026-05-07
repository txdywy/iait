import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityType } from '../../data/types';
import type { EntityCrossRef, LatestIndex } from '../../data/types';
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
  entities: {},
};

afterEach(() => cleanup());

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

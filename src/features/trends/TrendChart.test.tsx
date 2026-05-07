import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { EntityType } from '../../data/types';
import TrendChart, { resolveReactEChartsCore } from './TrendChart';

const historyEntry = {
  type: EntityType.COUNTRY,
  name: 'United States',
  series: [
    { timestamp: '2026-05-06T00:00:00.000Z', score: 72.5, factors: { gpu_supply: 5 } },
    { timestamp: '2026-05-07T00:00:00.000Z', score: 88.2, factors: { gpu_supply: 7 } },
  ],
};

describe('TrendChart', () => {
  it('unwraps CommonJS-shaped ECharts React core modules for browser rendering', () => {
    function Component() {
      return null;
    }

    expect(resolveReactEChartsCore({ default: Component })).toBe(Component);
  });

  it('renders the ECharts React wrapper instead of crashing on module interop', () => {
    render(<TrendChart historyEntry={historyEntry} />);

    expect(document.querySelector('.echarts-for-react')).toBeInTheDocument();
  });

  it('renders empty copy when no history is available', () => {
    render(<TrendChart />);

    expect(screen.getByText('No recent history')).toBeInTheDocument();
  });
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { buildTrendOption } from './trend-options';

const historyEntry = {
  type: 'country' as const,
  name: 'United States',
  series: [
    { timestamp: '2026-05-06T00:00:00.000Z', score: 72.5, factors: { gpu_supply: 5 } },
    { timestamp: '2026-05-07T00:00:00.000Z', score: 88.2, factors: { gpu_supply: 7 } },
  ],
};

describe('buildTrendOption', () => {
  it('maps history timestamps to x-axis data and scores to y-axis series data', () => {
    const result = buildTrendOption(historyEntry);

    expect(result.emptyText).toBeNull();
    expect(result.option.xAxis).toMatchObject({ data: ['2026-05-06', '2026-05-07'] });
    expect(result.option.series).toMatchObject([{ data: [72.5, 88.2] }]);
  });

  it('returns exact empty copy when history is absent', () => {
    const result = buildTrendOption(undefined);

    expect(result.emptyText).toBe('No recent history');
    expect(result.option.series).toMatchObject([{ data: [] }]);
  });

  it('uses HUD trend colors and muted grid lines', () => {
    const result = buildTrendOption(historyEntry);
    const json = JSON.stringify(result.option);

    expect(json).toContain('#22D3EE');
    expect(json).toContain('#22C55E');
    expect(json).toContain('#F59E0B');
    expect(json).toContain('rgba(100,116,139,0.24)');
  });

  it('TrendChart uses only ECharts core imports and selected modules', () => {
    const source = readFileSync(join(process.cwd(), 'src/features/trends/TrendChart.tsx'), 'utf8');

    expect(source).toContain("echarts-for-react/lib/core");
    expect(source).toContain("echarts/core");
    expect(source).toContain('LineChart');
    expect(source).toContain('GridComponent');
    expect(source).toContain('TooltipComponent');
    expect(source).toContain('CanvasRenderer');
    expect(source).not.toMatch(/BarChart|PieChart|SVGRenderer|DataZoomComponent/);
  });
});

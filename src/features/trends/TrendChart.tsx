import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { ComponentType } from 'react';
import type { HistoryEntry } from '../../data/types';
import { buildTrendOption } from './trend-options';

export function resolveReactEChartsCore(module: unknown) {
  if (typeof module === 'function') return module as ComponentType<Record<string, unknown>>;

  const maybeDefault = (module as { default?: unknown }).default;
  if (typeof maybeDefault === 'function') return maybeDefault as ComponentType<Record<string, unknown>>;

  return module as ComponentType<Record<string, unknown>>;
}

const EChartsCore = resolveReactEChartsCore(ReactEChartsCore);

echarts.use([LineChart, GridComponent, TooltipComponent, CanvasRenderer]);

interface TrendChartProps {
  historyEntry?: HistoryEntry;
}

export default function TrendChart({ historyEntry }: TrendChartProps) {
  const { option, emptyText } = buildTrendOption(historyEntry);

  if (emptyText) {
    return (
      <div className="flex min-h-40 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.035] font-mono text-sm text-[var(--ca-muted)]">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <EChartsCore echarts={echarts} option={option} notMerge lazyUpdate style={{ height: 220, width: '100%' }} />
    </div>
  );
}

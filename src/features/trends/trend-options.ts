import type { EChartsCoreOption } from 'echarts/core';
import type { HistoryEntry } from '../../data/types';

export interface TrendOptionResult {
  option: EChartsCoreOption;
  emptyText: 'No recent history' | null;
}

function formatDate(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) {
    return timestamp;
  }

  return parsed.toISOString().slice(0, 10);
}

export function buildTrendOption(historyEntry?: HistoryEntry): TrendOptionResult {
  const points = historyEntry?.series ?? [];
  const xData = points.map((point) => formatDate(point.timestamp));
  const yData = points.map((point) => point.score);

  return {
    emptyText: points.length === 0 ? 'No recent history' : null,
    option: {
      backgroundColor: 'transparent',
      color: ['#22D3EE', '#22C55E', '#F59E0B'],
      grid: {
        left: 36,
        right: 16,
        top: 24,
        bottom: 28,
        borderColor: 'rgba(100,116,139,0.24)',
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(11,17,32,0.94)',
        borderColor: 'rgba(34,211,238,0.32)',
        textStyle: { color: '#E5F0FF', fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace' },
      },
      xAxis: {
        type: 'category',
        data: xData,
        axisLine: { lineStyle: { color: 'rgba(100,116,139,0.42)' } },
        axisTick: { show: false },
        axisLabel: { color: '#94A3B8', fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace' },
        splitLine: { show: true, lineStyle: { color: 'rgba(100,116,139,0.24)' } },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 100,
        axisLabel: { color: '#94A3B8', fontFamily: 'IBM Plex Mono, JetBrains Mono, monospace' },
        splitLine: { lineStyle: { color: 'rgba(100,116,139,0.24)' } },
      },
      series: [
        {
          name: historyEntry?.name ?? 'Compute trend signal',
          type: 'line',
          data: yData,
          smooth: true,
          symbol: 'circle',
          symbolSize: 7,
          lineStyle: { color: '#22D3EE', width: 3 },
          itemStyle: { color: '#F59E0B', borderColor: '#22C55E', borderWidth: 1 },
          areaStyle: { color: 'rgba(34,211,238,0.12)' },
        },
      ],
    },
  };
}

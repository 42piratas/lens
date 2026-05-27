export type ChartLinePoint = {
  /** X-axis value. Strings render as categorical labels; numbers as linear positions. */
  x: number | string;
  y: number;
};

export type ChartLineSeries = {
  id: string;
  label: string;
  /** CSS color or token, e.g. "var(--chart-1)". */
  color: string;
  points: ChartLinePoint[];
};

export type ChartLineData = {
  series: ChartLineSeries[];
  xLabel?: string;
  yLabel?: string;
};

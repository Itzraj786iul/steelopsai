/** Industrial dark palette for Recharts — colorblind-safe pairs */
export const INDUSTRIAL_CHART = {
  primary: "#FF7A1A",
  secondary: "#5FA8D3",
  accent: "#06D6A0",
  prediction: "#818CF8",
  warning: "#FBBF24",
  critical: "#F87171",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
  card: "hsl(var(--card))",
  foreground: "hsl(var(--foreground))",
} as const;

export const CHART_SERIES = [
  INDUSTRIAL_CHART.secondary,
  INDUSTRIAL_CHART.primary,
  INDUSTRIAL_CHART.accent,
  INDUSTRIAL_CHART.prediction,
  INDUSTRIAL_CHART.warning,
] as const;

export const industrialTooltipStyle = {
  background: INDUSTRIAL_CHART.card,
  border: `1px solid ${INDUSTRIAL_CHART.grid}`,
  borderRadius: 8,
  color: INDUSTRIAL_CHART.foreground,
  fontSize: 12,
} as const;

export const industrialAxisProps = {
  stroke: INDUSTRIAL_CHART.muted,
  tick: { fill: INDUSTRIAL_CHART.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

export const industrialGridProps = {
  strokeDasharray: "3 3",
  stroke: INDUSTRIAL_CHART.grid,
  vertical: false,
} as const;

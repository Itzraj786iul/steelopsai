export interface DemoEvent {
  id: string;
  phase: string;
  title: string;
  description: string;
  href?: string;
  durationMs: number;
  metric?: string;
}

export interface DemoScenario {
  id: string;
  title: string;
  description: string;
  tag: string;
  heatCount: number;
  events: DemoEvent[];
}

const fullDayEvents: DemoEvent[] = [
  { id: "e1", phase: "Morning briefing", title: "12 heats scheduled", description: "Shift A schedule loaded with mixed grades and DRI ratios.", href: "/dashboard", durationMs: 4000, metric: "12 heats" },
  { id: "e2", phase: "AI predictions", title: "Foundation model forecasts", description: "Heat time predictions generated for all 12 heats with 91% confidence.", href: "/copilot", durationMs: 5000, metric: "91% accuracy" },
  { id: "e3", phase: "Operator review", title: "3 recommendations pending", description: "Operators review lime and oxygen adjustments on heats 4, 7, and 9.", href: "/copilot", durationMs: 5000, metric: "3 approvals" },
  { id: "e4", phase: "Approval", title: "Shift incharge approves", description: "Recipe delta accepted — projected 0.8 min savings per heat.", href: "/approvals", durationMs: 4000, metric: "₹42K saved" },
  { id: "e5", phase: "Digital twin", title: "Twin validation", description: "Pre-heat simulation confirms safe oxygen ramp for heat 5.", href: "/preheat", durationMs: 5000 },
  { id: "e6", phase: "Live execution", title: "Heat 5 in progress", description: "Live telemetry streaming — power, oxygen, and temperature on track.", href: "/live", durationMs: 6000, metric: "52.1 min" },
  { id: "e7", phase: "Mission control", title: "Queue updated", description: "Priority queue re-ranked after heat 3 early tap.", href: "/insights/control-tower", durationMs: 4000 },
  { id: "e8", phase: "Learning", title: "Lesson captured", description: "High phosphorus event logged — root cause linked to scrap mix.", href: "/knowledge/lessons", durationMs: 4000 },
  { id: "e9", phase: "Agents", title: "Optimization agent", description: "Agent proposes inventory rebalance for afternoon heats.", href: "/collaboration/agents", durationMs: 4000 },
  { id: "e10", phase: "Executive", title: "Daily savings", description: "Executive dashboard shows ₹186K saved and 4.3% efficiency gain.", href: "/executive", durationMs: 5000, metric: "₹186K" },
  { id: "e11", phase: "Shift handover", title: "Shift A → B", description: "Handover package with AI adoption 87% and 2 open risks.", href: "/shift/handover", durationMs: 4000 },
  { id: "e12", phase: "Complete", title: "Day complete", description: "All 12 heats executed. Demo finished — explore any module.", durationMs: 3000 },
];

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "full-day",
    title: "Interactive product demo",
    description: "A realistic production day — 12 heats, predictions, approvals, live execution, and executive summary.",
    tag: "Featured",
    heatCount: 12,
    events: fullDayEvents,
  },
  {
    id: "high-phosphorus",
    title: "High phosphorus heat",
    description: "AI detects chemistry risk and recommends scrap mix correction before tap.",
    tag: "Quality",
    heatCount: 1,
    events: fullDayEvents.slice(0, 5).map((e) => ({ ...e, title: e.title.replace("12", "1") })),
  },
  {
    id: "fast-production",
    title: "Fast production day",
    description: "Compressed schedule with aggressive heat times and high AI adoption.",
    tag: "Throughput",
    heatCount: 16,
    events: fullDayEvents.slice(0, 8),
  },
  {
    id: "power-constrained",
    title: "Power constrained day",
    description: "Peak tariff windows force power-aware recipe optimization.",
    tag: "Energy",
    heatCount: 10,
    events: fullDayEvents.slice(2, 9),
  },
  {
    id: "inventory-shortage",
    title: "Inventory shortage",
    description: "DRI shortfall triggers agent-assisted material substitution.",
    tag: "Materials",
    heatCount: 8,
    events: fullDayEvents.slice(1, 7),
  },
  {
    id: "maintenance",
    title: "Maintenance event",
    description: "EAF-2 offline — schedule re-optimized across remaining furnaces.",
    tag: "Reliability",
    heatCount: 6,
    events: fullDayEvents.slice(0, 6),
  },
  {
    id: "shift-change",
    title: "Shift change",
    description: "Handover workflow with adoption metrics and open recommendations.",
    tag: "Operations",
    heatCount: 12,
    events: fullDayEvents.slice(8),
  },
];

export function getScenarioById(id: string): DemoScenario | undefined {
  return DEMO_SCENARIOS.find((s) => s.id === id);
}

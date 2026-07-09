import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Clock,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  Home,
  Layers,
  LineChart,
  Map,
  Scale,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";

import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
  children?: NavDefinition[];
}

/** JSPL EAF Tap-to-Tap — unified product navigation */
export const PRIMARY_NAV: NavDefinition[] = [
  { href: "/eaf/dashboard", label: "Dashboard", icon: Home },
  { href: "/eaf/prediction", label: "Prediction", icon: Target },
  { href: "/eaf/optimizer", label: "Recipe Optimizer", icon: Cpu },
  { href: "/eaf/whatif", label: "What-if Analysis", icon: Sparkles },
  { href: "/eaf/historical", label: "Historical Analysis", icon: BarChart3 },
  { href: "/eaf/health", label: "Process Health", icon: Activity },
  { href: "/eaf/model", label: "Model Insights", icon: LineChart },
  { href: "/eaf/reports", label: "Reports", icon: FileText },
  {
    href: "/eaf/research",
    label: "Research Center",
    icon: FlaskConical,
    children: [
      { href: "/eaf/research", label: "Research Overview", icon: FlaskConical },
      { href: "/eaf/research/leakage", label: "Leakage Analysis", icon: ShieldAlert },
      { href: "/eaf/research/evolution", label: "Model Evolution", icon: GitBranch },
      { href: "/eaf/research/two-stage", label: "Two-stage Architecture", icon: Layers },
      { href: "/eaf/research/features", label: "Feature Discovery", icon: Sparkles },
      { href: "/eaf/research/roadmap", label: "Industrial Roadmap", icon: Map },
      { href: "/eaf/research/digital-twin", label: "Digital Twin", icon: Cpu },
      { href: "/eaf/research/data-collection", label: "Future Data Collection", icon: Database },
      { href: "/eaf/research/comparison", label: "Production vs Research", icon: Scale },
      { href: "/eaf/research/timeline", label: "Model Timeline", icon: Clock },
    ],
  },
  { href: "/eaf/settings", label: "Settings", icon: Settings },
  { href: "/eaf/about", label: "About", icon: BookOpen },
];

export const INSIGHTS_NAV: NavDefinition[] = [];
export const SECONDARY_NAV: NavDefinition[] = [];
export const PLATFORM_NAV: NavDefinition[] = [];

export const ALL_NAV_ITEMS: NavDefinition[] = PRIMARY_NAV;

export const QUICK_ACTIONS = [
  { id: "dashboard", label: "Dashboard", href: "/eaf/dashboard", shortcut: "D" },
  { id: "predict", label: "Predict TTT", href: "/eaf/prediction", shortcut: "P" },
  { id: "optimize", label: "Recipe Optimizer", href: "/eaf/optimizer", shortcut: "O" },
  { id: "whatif", label: "What-if Analysis", href: "/eaf/whatif", shortcut: "W" },
  { id: "insights", label: "Model Insights", href: "/eaf/model" },
  { id: "reports", label: "Reports", href: "/eaf/reports" },
  { id: "research", label: "Research Center", href: "/eaf/research" },
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [
    item,
    ...(item.children ? flattenNavItems(item.children) : []),
  ]);
}

import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  FileText,
  Home,
  LineChart,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";

import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
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
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children as NavDefinition[]) : [])]);
}

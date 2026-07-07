import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  Cpu,
  FileText,
  Flame,
  Home,
  LineChart,
  Sparkles,
  Target,
} from "lucide-react";

import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
}

/** JSPL EAF Tap-to-Tap — primary product navigation */
export const PRIMARY_NAV: NavDefinition[] = [
  { href: "/eaf/dashboard", label: "Dashboard", icon: Home },
  { href: "/eaf/prediction", label: "Prediction", icon: Target },
  { href: "/eaf/optimizer", label: "Optimizer", icon: Cpu },
  { href: "/eaf/whatif", label: "What-if", icon: Sparkles },
  { href: "/eaf/historical", label: "Historical", icon: BarChart3 },
  { href: "/eaf/health", label: "Process Health", icon: Activity },
  { href: "/eaf/model", label: "Model Info", icon: LineChart },
  { href: "/eaf/reports", label: "Reports", icon: FileText },
  { href: "/eaf/about", label: "About", icon: BookOpen },
];

export const INSIGHTS_NAV: NavDefinition[] = [];

export const SECONDARY_NAV: NavDefinition[] = [];

export const PLATFORM_NAV: NavDefinition[] = [
  { href: "/", label: "Home", icon: Flame },
  { href: "/eaf/about", label: "Documentation", icon: BookOpen },
];

export const ALL_NAV_ITEMS: NavDefinition[] = [...PRIMARY_NAV, ...PLATFORM_NAV];

export const QUICK_ACTIONS = [
  { id: "dashboard", label: "EAF Dashboard", href: "/eaf/dashboard", shortcut: "D" },
  { id: "predict", label: "Predict TTT", href: "/eaf/prediction", shortcut: "P" },
  { id: "optimize", label: "Optimize Recipe", href: "/eaf/optimizer", shortcut: "O" },
  { id: "whatif", label: "What-if Analysis", href: "/eaf/whatif", shortcut: "W" },
  { id: "reports", label: "Download Reports", href: "/eaf/reports" },
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children as NavDefinition[]) : [])]);
}

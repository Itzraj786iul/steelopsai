import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Calendar,
  CheckSquare,
  ClipboardList,
  Cpu,
  FileText,
  Flame,
  GitBranch,
  Home,
  Layers,
  LineChart,
  Network,
  Search,
  Settings,
  Shield,
  Sparkles,
  Target,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { UserRole } from "@/lib/enums";
import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
}

/** Workflow-first navigation — operator journey, not feature list */
export const PRIMARY_NAV: NavDefinition[] = [
  { href: "/eaf/dashboard", label: "EAF TTT", icon: Flame },
  { href: "/dashboard", label: "Today", icon: Home },
  { href: "/copilot", label: "Mission", icon: Target, badgeKey: "preheat" },
  { href: "/live", label: "Live", icon: LineChart, badgeKey: "live" },
  { href: "/planning/schedule", label: "Planning", icon: Calendar },
  { href: "/insights/control-tower", label: "Plant", icon: Building2 },
  { href: "/knowledge/lessons", label: "Learning", icon: BookOpen },
  { href: "/settings", label: "Admin", icon: Settings },
];

export const INSIGHTS_NAV: NavDefinition[] = [
  { href: "/insights/shift", label: "Shift", icon: Users },
  { href: "/insights/quality", label: "Quality", icon: BarChart3 },
  { href: "/insights/energy", label: "Energy", icon: Zap },
  { href: "/approvals", label: "Approvals", icon: CheckSquare, badgeKey: "approvals" },
];

export const SECONDARY_NAV: NavDefinition[] = [
  { href: "/heats", label: "All heats", icon: Flame, badgeKey: "heats" },
  { href: "/preheat", label: "Pre-Heat analysis", icon: Zap },
  { href: "/executive", label: "Executive", icon: LineChart },
  { href: "/collaboration/war-room", label: "Collaboration", icon: Network },
];

export const PLATFORM_NAV: NavDefinition[] = [
  { href: "/onboarding", label: "Onboarding", icon: Sparkles },
  { href: "/help", label: "Help", icon: BookOpen },
  { href: "/profile", label: "Profile", icon: Users },
];

export const ALL_NAV_ITEMS: NavDefinition[] = [
  ...PRIMARY_NAV,
  ...INSIGHTS_NAV,
  { href: "/insights/control-tower", label: "Mission Control", icon: Building2 },
  { href: "/insights/forecast", label: "Forecast", icon: LineChart },
  { href: "/insights/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/insights/plant-control", label: "Plant Control", icon: Layers },
  { href: "/heats/queue", label: "Heat Queue", icon: ClipboardList },
  { href: "/heats/active", label: "Active Heats", icon: Flame },
  { href: "/heats/history", label: "Heat History", icon: FileText },
  { href: "/recipes/compare", label: "Recipe Compare", icon: GitBranch },
  { href: "/recipes", label: "Recipe Portfolio", icon: Layers },
  { href: "/copilot", label: "Copilot Workspace", icon: Bot },
  { href: "/live/alerts", label: "Live Alerts", icon: Bell },
  { href: "/shift/handover", label: "Shift Handover", icon: Users },
  { href: "/planning/inventory", label: "Inventory", icon: Sparkles },
  { href: "/planning/scenarios", label: "Scenarios", icon: GitBranch },
  { href: "/knowledge/search", label: "Knowledge Search", icon: Search },
  { href: "/knowledge/root-cause", label: "Root Cause", icon: Shield },
  { href: "/knowledge/graph", label: "Knowledge Graph", icon: Network },
  { href: "/executive/ai", label: "Executive AI", icon: Bot },
  { href: "/executive/reports", label: "Reports", icon: FileText },
  { href: "/executive/multi-plant", label: "Multi-Plant", icon: Building2, roles: [UserRole.CorporateManagement, UserRole.PlantHead, UserRole.Administrator] },
  { href: "/collaboration/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/collaboration/agents", label: "Agents", icon: Bot },
  { href: "/labs/optimization", label: "Optimization Lab", icon: Cpu, roles: [UserRole.ProcessEngineer, UserRole.ProductionManager, UserRole.PlantHead, UserRole.Developer] },
  { href: "/labs/simulation", label: "Simulation Lab", icon: Sparkles, roles: [UserRole.ProcessEngineer, UserRole.ProductionManager, UserRole.PlantHead, UserRole.Developer] },
  { href: "/settings/org", label: "Organization", icon: Building2 },
  { href: "/settings/users", label: "Users & Roles", icon: Users, roles: [UserRole.Administrator] },
  { href: "/settings/governance", label: "Governance", icon: Shield, roles: [UserRole.Administrator] },
  { href: "/settings/integrations", label: "Integrations", icon: Network },
  { href: "/settings/developer", label: "Developer", icon: Cpu, roles: [UserRole.Developer, UserRole.Administrator] },
  { href: "/settings/readiness", label: "Readiness", icon: CheckSquare },
  { href: "/settings/training", label: "Training", icon: BookOpen },
  { href: "/settings/licenses", label: "Licenses", icon: Shield },
  { href: "/help", label: "Help Center", icon: BookOpen },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/onboarding", label: "Onboarding", icon: Sparkles },
  ...SECONDARY_NAV,
];

export const QUICK_ACTIONS = [
  { id: "today", label: "Today's Mission", href: "/dashboard", shortcut: "T" },
  { id: "copilot", label: "Open Mission Workspace", href: "/copilot", shortcut: "C" },
  { id: "live-floor", label: "View Live Floor", href: "/live", shortcut: "L" },
  { id: "approvals", label: "Pending Approvals", href: "/approvals", shortcut: "A" },
  { id: "control-tower", label: "Mission Control", href: "/insights/control-tower" },
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children as NavDefinition[]) : [])]);
}

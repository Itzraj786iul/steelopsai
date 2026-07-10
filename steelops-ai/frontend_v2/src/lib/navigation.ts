import type { LucideIcon } from "lucide-react";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock,
  Cpu,
  Database,
  FileText,
  FlaskConical,
  GitBranch,
  HardDrive,
  Home,
  Layers,
  LineChart,
  Map,
  MessageSquare,
  Scale,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Zap,
  Gauge,
  FileSearch,
  Users,
  Bell,
  Shield,
  AlertTriangle,
  Wrench,
  Building2,
  CalendarDays,
  Search,
  ListOrdered,
  Handshake,
  CheckSquare,
  Megaphone,
  Factory,
  UserCheck,
  ClipboardCheck,
  LayoutGrid,
  CalendarRange,
  Monitor,
  PanelsTopLeft,
} from "lucide-react";

import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
  children?: NavDefinition[];
  section?: "production" | "research" | "enterprise" | "tools" | "admin";
}

export const PRODUCTION_NAV: NavDefinition[] = [
  { href: "/eaf/dashboard", label: "Dashboard", icon: Home, section: "production" },
  { href: "/eaf/prediction", label: "Prediction", icon: Target, section: "production" },
  { href: "/eaf/optimizer", label: "Optimizer", icon: Cpu, section: "production" },
  { href: "/eaf/validation", label: "Validation", icon: CheckCircle2, section: "production" },
  { href: "/eaf/reports", label: "Reports", icon: FileText, section: "production" },
  { href: "/eaf/heat-history", label: "Heat History", icon: ClipboardList, section: "production" },
  { href: "/eaf/shift-dashboard", label: "Shift Dashboard", icon: Gauge, section: "production" },
];

export const ADMIN_NAV: NavDefinition[] = [
  { href: "/eaf/admin", label: "Admin Dashboard", icon: Shield, section: "admin" },
  { href: "/eaf/plant-dashboard", label: "Plant Manager", icon: Building2, section: "admin" },
  { href: "/eaf/production-manager", label: "Production Manager", icon: Gauge, section: "admin" },
  { href: "/eaf/production-plan", label: "Production Plan", icon: CalendarRange, section: "admin" },
  { href: "/eaf/heat-scheduler", label: "Heat Scheduler", icon: ListOrdered, section: "admin" },
  { href: "/eaf/live-board", label: "Live Board", icon: LayoutGrid, section: "admin" },
  { href: "/eaf/kpi-wall", label: "KPI Wall", icon: PanelsTopLeft, section: "admin" },
  { href: "/eaf/operator-board", label: "Operator Board", icon: UserCheck, section: "admin" },
  { href: "/eaf/supervisor-board", label: "Supervisor Board", icon: Monitor, section: "admin" },
  { href: "/eaf/plant-manager-board", label: "Plant MES Board", icon: Building2, section: "admin" },
  { href: "/eaf/production-timeline", label: "Production Timeline", icon: Clock, section: "admin" },
  { href: "/eaf/delay-dashboard", label: "Delay Dashboard", icon: Wrench, section: "admin" },
  { href: "/eaf/mes-reports", label: "MES Reports", icon: FileText, section: "admin" },
  { href: "/eaf/mes-search", label: "MES Search", icon: Search, section: "admin" },
  { href: "/eaf/shifts", label: "Shift Management", icon: Clock, section: "admin" },
  { href: "/eaf/furnaces", label: "Furnaces", icon: Factory, section: "admin" },
  { href: "/eaf/heat-queue", label: "Heat Queue", icon: ListOrdered, section: "admin" },
  { href: "/eaf/shift-handover", label: "Shift Handover", icon: Handshake, section: "admin" },
  { href: "/eaf/approvals", label: "Approvals", icon: ClipboardCheck, section: "admin" },
  { href: "/eaf/tasks", label: "Tasks", icon: CheckSquare, section: "admin" },
  { href: "/eaf/calendar", label: "Plant Calendar", icon: CalendarDays, section: "admin" },
  { href: "/eaf/operator-performance", label: "Operator Performance", icon: UserCheck, section: "admin" },
  { href: "/eaf/announcements", label: "Announcements", icon: Megaphone, section: "admin" },
  { href: "/eaf/search", label: "Enterprise Search", icon: Search, section: "admin" },
  { href: "/eaf/ops-reports", label: "Ops Reports", icon: FileText, section: "admin" },
  { href: "/eaf/users", label: "User Management", icon: Users, section: "admin" },
  { href: "/eaf/audit-log", label: "Audit Log", icon: ScrollText, section: "admin" },
  { href: "/eaf/alerts", label: "Alert Center", icon: AlertTriangle, section: "admin" },
  { href: "/eaf/notifications", label: "Notifications", icon: Bell, section: "admin" },
  { href: "/eaf/delays", label: "Delay Management", icon: Wrench, section: "admin" },
];

export const RESEARCH_NAV: NavDefinition[] = [
  { href: "/eaf/optimizer?mode=research", label: "Optimizer V2", icon: FlaskConical, section: "research" },
  { href: "/eaf/prediction", label: "Hybrid Engine", icon: Zap, section: "research" },
  { href: "/eaf/reliability", label: "Reliability", icon: BarChart3, section: "research" },
  { href: "/eaf/digital-twin-readiness", label: "Digital Twin", icon: Cpu, section: "research" },
  { href: "/eaf/research/timeline", label: "Research Timeline", icon: Clock, section: "research" },
];

export const ENTERPRISE_NAV: NavDefinition[] = [
  { href: "/eaf/audit/predictions", label: "Prediction Audit", icon: ScrollText, section: "enterprise" },
  { href: "/eaf/audit/recommendations", label: "Recommendation Audit", icon: ClipboardList, section: "enterprise" },
  { href: "/eaf/versions", label: "Version Control", icon: GitBranch, section: "enterprise" },
  { href: "/eaf/system-health", label: "System Health", icon: Activity, section: "enterprise" },
  { href: "/eaf/explainability", label: "Explainability", icon: FileSearch, section: "enterprise" },
  { href: "/eaf/validation-center", label: "Validation Center", icon: CheckCircle2, section: "enterprise" },
  { href: "/eaf/docs", label: "Documentation", icon: BookOpen, section: "enterprise" },
  { href: "/eaf/deployment-readiness", label: "Deployment Readiness", icon: ShieldAlert, section: "enterprise" },
  { href: "/eaf/session-backup", label: "Session Backup", icon: HardDrive, section: "enterprise" },
  { href: "/eaf/performance", label: "Performance", icon: Gauge, section: "enterprise" },
];

export const TOOLS_NAV: NavDefinition[] = [
  { href: "/eaf/whatif", label: "What-if Analysis", icon: Sparkles, section: "tools" },
  { href: "/eaf/historical", label: "Historical Analysis", icon: Database, section: "tools" },
  { href: "/eaf/health", label: "Process Health", icon: Activity, section: "tools" },
  { href: "/eaf/model", label: "Model Insights", icon: LineChart, section: "tools" },
  { href: "/eaf/feedback", label: "Operator Feedback", icon: MessageSquare, section: "tools" },
  {
    href: "/eaf/research",
    label: "Research Center",
    icon: FlaskConical,
    section: "tools",
    children: [
      { href: "/eaf/research", label: "Research Overview", icon: FlaskConical },
      { href: "/eaf/research/leakage", label: "Leakage Analysis", icon: ShieldAlert },
      { href: "/eaf/research/evolution", label: "Model Evolution", icon: GitBranch },
      { href: "/eaf/research/two-stage", label: "Two-stage Architecture", icon: Layers },
      { href: "/eaf/research/features", label: "Feature Discovery", icon: Sparkles },
      { href: "/eaf/research/roadmap", label: "Industrial Roadmap", icon: Map },
      { href: "/eaf/research/data-collection", label: "Future Data Collection", icon: Database },
      { href: "/eaf/research/comparison", label: "Production vs Research", icon: Scale },
    ],
  },
  { href: "/eaf/settings", label: "Settings", icon: Settings, section: "tools" },
  { href: "/eaf/about", label: "About", icon: BookOpen, section: "tools" },
];

export const PRIMARY_NAV: NavDefinition[] = [
  ...PRODUCTION_NAV,
  ...ADMIN_NAV,
  ...ENTERPRISE_NAV,
  ...RESEARCH_NAV,
  ...TOOLS_NAV,
];

export const INSIGHTS_NAV: NavDefinition[] = [];
export const SECONDARY_NAV: NavDefinition[] = [];
export const PLATFORM_NAV: NavDefinition[] = [];

export const ALL_NAV_ITEMS: NavDefinition[] = PRIMARY_NAV;

export const QUICK_ACTIONS = [
  { id: "dashboard", label: "Dashboard", href: "/eaf/dashboard", shortcut: "D" },
  { id: "predict", label: "Predict TTT", href: "/eaf/prediction", shortcut: "P" },
  { id: "optimize", label: "Optimizer", href: "/eaf/optimizer", shortcut: "O" },
  { id: "validation", label: "Validation", href: "/eaf/validation", shortcut: "V" },
  { id: "audit", label: "Prediction Audit", href: "/eaf/audit/predictions" },
  { id: "docs", label: "Documentation", href: "/eaf/docs" },
  { id: "whatif", label: "What-if Analysis", href: "/eaf/whatif", shortcut: "W" },
  { id: "reports", label: "Reports", href: "/eaf/reports" },
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

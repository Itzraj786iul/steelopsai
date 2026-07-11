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

import { UserRole } from "@/lib/enums";
import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
  children?: NavDefinition[];
  section?: "production" | "operations" | "admin" | "research" | "enterprise" | "tools";
}

const R = UserRole;

/** Floor execution — operators & shift crew (not admin sidebar). */
const FLOOR = [R.Operator, R.ShiftEngineer, R.ProductionManager];

/** Shift / production oversight. */
const SUPERVISION = [R.ShiftEngineer, R.ProductionManager, R.PlantManager];

/** Planning & plant oversight (no operator board / predict). */
const PLANNING = [R.ProductionManager, R.PlantManager, R.Admin];

/** System administration only. */
const ADMIN_ONLY = [R.Admin];

/** Research / science (admin uses Administration, not research clutter). */
const RESEARCH_ROLES = [R.DataScientist, R.QualityEngineer];

export const PRODUCTION_NAV: NavDefinition[] = [
  { href: "/eaf/dashboard", label: "Dashboard", icon: Home, section: "production", roles: [...FLOOR, R.PlantManager] },
  { href: "/eaf/prediction", label: "Prediction", icon: Target, section: "production", roles: FLOOR },
  { href: "/eaf/optimizer", label: "Optimizer", icon: Cpu, section: "production", roles: FLOOR },
  { href: "/eaf/validation", label: "Validation", icon: CheckCircle2, section: "production", roles: [...FLOOR, R.QualityEngineer] },
  { href: "/eaf/operator-board", label: "Operator Board", icon: UserCheck, section: "production", roles: [R.Operator, R.ShiftEngineer] },
  { href: "/eaf/heat-history", label: "Heat History", icon: ClipboardList, section: "production", roles: [...FLOOR, R.PlantManager, R.QualityEngineer, R.Viewer, R.MaintenanceEngineer, R.DataScientist] },
  { href: "/eaf/reports", label: "Reports", icon: FileText, section: "production", roles: [...SUPERVISION, R.QualityEngineer, R.Viewer, R.MaintenanceEngineer, R.DataScientist] },
  { href: "/eaf/tasks", label: "My Tasks", icon: CheckSquare, section: "production", roles: [R.Operator, R.ShiftEngineer, R.QualityEngineer, R.MaintenanceEngineer] },
];

/** MES + shift operations for managers / supervisors — not operator personal board. */
export const OPERATIONS_NAV: NavDefinition[] = [
  { href: "/eaf/live-board", label: "Live Board", icon: LayoutGrid, section: "operations", roles: [...SUPERVISION, R.Operator] },
  { href: "/eaf/kpi-wall", label: "KPI Wall", icon: PanelsTopLeft, section: "operations", roles: SUPERVISION },
  { href: "/eaf/shift-dashboard", label: "Shift Dashboard", icon: Gauge, section: "operations", roles: [...SUPERVISION, R.MaintenanceEngineer] },
  { href: "/eaf/supervisor-board", label: "Supervisor Board", icon: Monitor, section: "operations", roles: [R.ShiftEngineer, R.ProductionManager] },
  { href: "/eaf/production-manager", label: "Production Manager", icon: Gauge, section: "operations", roles: [R.ProductionManager, R.PlantManager] },
  { href: "/eaf/plant-manager-board", label: "Plant MES Board", icon: Building2, section: "operations", roles: [R.PlantManager, R.ProductionManager] },
  { href: "/eaf/plant-dashboard", label: "Plant Dashboard", icon: Building2, section: "operations", roles: [R.PlantManager] },
  { href: "/eaf/production-plan", label: "Production Plan", icon: CalendarRange, section: "operations", roles: PLANNING },
  { href: "/eaf/heat-scheduler", label: "Heat Scheduler", icon: ListOrdered, section: "operations", roles: [...PLANNING, R.ShiftEngineer, R.Operator] },
  { href: "/eaf/heat-queue", label: "Heat Queue", icon: ListOrdered, section: "operations", roles: [...SUPERVISION, R.Operator] },
  { href: "/eaf/approvals", label: "Approvals", icon: ClipboardCheck, section: "operations", roles: [...SUPERVISION, R.Operator] },
  { href: "/eaf/shift-handover", label: "Shift Handover", icon: Handshake, section: "operations", roles: [R.ShiftEngineer, R.ProductionManager] },
  { href: "/eaf/production-timeline", label: "Production Timeline", icon: Clock, section: "operations", roles: [...SUPERVISION, R.Operator] },
  { href: "/eaf/operator-performance", label: "Operator Performance", icon: UserCheck, section: "operations", roles: [...SUPERVISION, R.Operator] },
  { href: "/eaf/delay-dashboard", label: "Delay Dashboard", icon: Wrench, section: "operations", roles: [...SUPERVISION, R.MaintenanceEngineer] },
  { href: "/eaf/delays", label: "Delay Log", icon: Wrench, section: "operations", roles: [R.MaintenanceEngineer, R.ProductionManager, R.ShiftEngineer] },
  { href: "/eaf/calendar", label: "Plant Calendar", icon: CalendarDays, section: "operations", roles: [...SUPERVISION, R.MaintenanceEngineer, R.Admin] },
  { href: "/eaf/mes-reports", label: "MES Reports", icon: FileText, section: "operations", roles: [...SUPERVISION, R.Viewer] },
  { href: "/eaf/ops-reports", label: "Ops Reports", icon: FileText, section: "operations", roles: [...SUPERVISION, R.Viewer] },
];

/** Slim admin console — system control only. */
export const ADMIN_NAV: NavDefinition[] = [
  { href: "/eaf/admin", label: "Admin Dashboard", icon: Shield, section: "admin", roles: ADMIN_ONLY },
  { href: "/eaf/users", label: "User Management", icon: Users, section: "admin", roles: ADMIN_ONLY },
  { href: "/eaf/audit-log", label: "Audit Log", icon: ScrollText, section: "admin", roles: [R.Admin, R.Viewer, R.PlantManager] },
  { href: "/eaf/furnaces", label: "Furnaces", icon: Factory, section: "admin", roles: PLANNING },
  { href: "/eaf/shifts", label: "Shift Management", icon: Clock, section: "admin", roles: [...PLANNING, R.ShiftEngineer] },
  { href: "/eaf/announcements", label: "Announcements", icon: Megaphone, section: "admin", roles: [...PLANNING, R.ShiftEngineer, R.Operator, R.Viewer] },
  { href: "/eaf/alerts", label: "Alert Center", icon: AlertTriangle, section: "admin", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.ShiftEngineer, R.Operator, R.MaintenanceEngineer, R.QualityEngineer, R.DataScientist, R.Viewer] },
  { href: "/eaf/notifications", label: "Notifications", icon: Bell, section: "admin", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.ShiftEngineer, R.Operator, R.QualityEngineer, R.MaintenanceEngineer, R.DataScientist, R.Viewer] },
  { href: "/eaf/search", label: "Enterprise Search", icon: Search, section: "admin", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.ShiftEngineer, R.Viewer] },
  { href: "/eaf/mes-search", label: "MES Search", icon: Search, section: "admin", roles: [R.PlantManager, R.ProductionManager, R.ShiftEngineer, R.Viewer] },
  { href: "/eaf/system-health", label: "System Health", icon: Activity, section: "admin", roles: [R.Admin, R.DataScientist, R.PlantManager] },
  { href: "/eaf/session-backup", label: "Session Backup", icon: HardDrive, section: "admin", roles: ADMIN_ONLY },
  { href: "/eaf/settings", label: "Settings", icon: Settings, section: "admin", roles: [R.Admin, R.PlantManager] },
];

export const RESEARCH_NAV: NavDefinition[] = [
  { href: "/eaf/optimizer?mode=research", label: "Optimizer V2", icon: FlaskConical, section: "research", roles: [...RESEARCH_ROLES, R.Admin] },
  { href: "/eaf/reliability", label: "Reliability", icon: BarChart3, section: "research", roles: [...RESEARCH_ROLES, R.PlantManager] },
  { href: "/eaf/digital-twin-readiness", label: "Digital Twin", icon: Cpu, section: "research", roles: RESEARCH_ROLES },
  { href: "/eaf/research/timeline", label: "Research Timeline", icon: Clock, section: "research", roles: RESEARCH_ROLES },
];

export const ENTERPRISE_NAV: NavDefinition[] = [
  { href: "/eaf/audit/predictions", label: "Prediction Audit", icon: ScrollText, section: "enterprise", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.Viewer] },
  { href: "/eaf/audit/recommendations", label: "Recommendation Audit", icon: ClipboardList, section: "enterprise", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.Viewer] },
  { href: "/eaf/versions", label: "Version Control", icon: GitBranch, section: "enterprise", roles: [R.Admin, R.DataScientist] },
  { href: "/eaf/explainability", label: "Explainability", icon: FileSearch, section: "enterprise", roles: RESEARCH_ROLES },
  { href: "/eaf/validation-center", label: "Validation Center", icon: CheckCircle2, section: "enterprise", roles: [R.QualityEngineer, R.ProductionManager] },
  { href: "/eaf/docs", label: "Documentation", icon: BookOpen, section: "enterprise", roles: [R.Admin, R.PlantManager, R.DataScientist, R.Viewer] },
  { href: "/eaf/deployment-readiness", label: "Deployment Readiness", icon: ShieldAlert, section: "enterprise", roles: [R.Admin, R.PlantManager, R.DataScientist] },
  { href: "/eaf/performance", label: "Performance", icon: Gauge, section: "enterprise", roles: [R.Admin, R.DataScientist] },
];

export const TOOLS_NAV: NavDefinition[] = [
  { href: "/eaf/whatif", label: "What-if Analysis", icon: Sparkles, section: "tools", roles: FLOOR },
  { href: "/eaf/historical", label: "Historical Analysis", icon: Database, section: "tools", roles: [...FLOOR, R.PlantManager, R.DataScientist, R.QualityEngineer] },
  { href: "/eaf/health", label: "Process Health", icon: Activity, section: "tools", roles: [...FLOOR, R.MaintenanceEngineer] },
  { href: "/eaf/model", label: "Model Insights", icon: LineChart, section: "tools", roles: RESEARCH_ROLES },
  { href: "/eaf/feedback", label: "Operator Feedback", icon: MessageSquare, section: "tools", roles: [R.Operator, R.ShiftEngineer] },
  {
    href: "/eaf/research",
    label: "Research Center",
    icon: FlaskConical,
    section: "tools",
    roles: RESEARCH_ROLES,
    children: [
      { href: "/eaf/research", label: "Research Overview", icon: FlaskConical, roles: RESEARCH_ROLES },
      { href: "/eaf/research/leakage", label: "Leakage Analysis", icon: ShieldAlert, roles: RESEARCH_ROLES },
      { href: "/eaf/research/evolution", label: "Model Evolution", icon: GitBranch, roles: RESEARCH_ROLES },
      { href: "/eaf/research/two-stage", label: "Two-stage Architecture", icon: Layers, roles: RESEARCH_ROLES },
      { href: "/eaf/research/features", label: "Feature Discovery", icon: Sparkles, roles: RESEARCH_ROLES },
      { href: "/eaf/research/roadmap", label: "Industrial Roadmap", icon: Map, roles: RESEARCH_ROLES },
      { href: "/eaf/research/data-collection", label: "Future Data Collection", icon: Database, roles: RESEARCH_ROLES },
      { href: "/eaf/research/comparison", label: "Production vs Research", icon: Scale, roles: RESEARCH_ROLES },
    ],
  },
  { href: "/eaf/about", label: "About", icon: BookOpen, section: "tools", roles: Object.values(R) },
];

export const PRIMARY_NAV: NavDefinition[] = [
  ...PRODUCTION_NAV,
  ...OPERATIONS_NAV,
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
  { id: "dashboard", label: "Dashboard", href: "/eaf/dashboard", shortcut: "D", roles: [...FLOOR, R.PlantManager] },
  { id: "predict", label: "Predict TTT", href: "/eaf/prediction", shortcut: "P", roles: FLOOR },
  { id: "optimize", label: "Optimizer", href: "/eaf/optimizer", shortcut: "O", roles: FLOOR },
  { id: "validation", label: "Validation", href: "/eaf/validation", shortcut: "V", roles: [...FLOOR, R.QualityEngineer] },
  { id: "admin", label: "Admin Dashboard", href: "/eaf/admin", roles: ADMIN_ONLY },
  { id: "users", label: "Users", href: "/eaf/users", roles: ADMIN_ONLY },
  { id: "live-board", label: "Live Board", href: "/eaf/live-board", roles: [...SUPERVISION, R.Operator] },
  { id: "audit", label: "Prediction Audit", href: "/eaf/audit/predictions", roles: [R.Admin, R.PlantManager, R.ProductionManager, R.Viewer] },
  { id: "docs", label: "Documentation", href: "/eaf/docs", roles: [R.Admin, R.PlantManager, R.DataScientist, R.Viewer] },
  { id: "whatif", label: "What-if Analysis", href: "/eaf/whatif", shortcut: "W", roles: FLOOR },
  { id: "reports", label: "Reports", href: "/eaf/reports", roles: [...SUPERVISION, R.QualityEngineer, R.Viewer] },
];

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

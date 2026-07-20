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
  Layers,
  LineChart,
  Map,
  Scale,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Gauge,
  FileSearch,
  Users,
  Shield,
  AlertTriangle,
  Wrench,
  CalendarDays,
  Search,
  ListOrdered,
  Handshake,
  CheckSquare,
  Megaphone,
  Factory,
  Building2,
  ClipboardCheck,
  LayoutGrid,
  CalendarRange,
} from "lucide-react";

import { UserRole } from "@/lib/enums";
import type { NavItem } from "@/types";

export interface NavDefinition extends NavItem {
  icon: LucideIcon;
  children?: NavDefinition[];
  section?: "production" | "operations" | "admin" | "research" | "enterprise" | "tools";
}

const R = UserRole;

/** Floor execution — operators & shift crew. */
const FLOOR = [R.Operator, R.ShiftEngineer, R.ProductionManager];

/** Shift / production oversight. */
const SUPERVISION = [R.ShiftEngineer, R.ProductionManager, R.PlantManager];

/** Planning & plant oversight. */
const PLANNING = [R.ProductionManager, R.PlantManager, R.Admin];

/** System administration only. */
const ADMIN_ONLY = [R.Admin];

/** Research / science. */
const RESEARCH_ROLES = [R.DataScientist, R.QualityEngineer];

/**
 * Floor heat path — linear for Operators / Shift / Production Manager.
 * Admin uses Administration section (support via Users / Audit), not floor nav.
 */
export const PRODUCTION_NAV: NavDefinition[] = [
  { href: "/eaf/prediction", label: "Prediction", icon: Target, section: "production", roles: FLOOR },
  { href: "/eaf/optimizer", label: "Optimizer", icon: Cpu, section: "production", roles: FLOOR },
  { href: "/eaf/validation", label: "Validation", icon: CheckCircle2, section: "production", roles: [...FLOOR, R.QualityEngineer] },
  { href: "/eaf/heat-history", label: "Heat History", icon: ClipboardList, section: "production", roles: [...FLOOR, R.PlantManager, R.QualityEngineer, R.Viewer, R.MaintenanceEngineer, R.DataScientist] },
  { href: "/eaf/reports", label: "Reports", icon: FileText, section: "production", roles: [...FLOOR, R.PlantManager, R.QualityEngineer, R.Viewer, R.MaintenanceEngineer, R.DataScientist] },
  { href: "/eaf/tasks", label: "My Tasks", icon: CheckSquare, section: "production", roles: [R.ShiftEngineer, R.QualityEngineer, R.MaintenanceEngineer] },
];

/**
 * MES / supervision — role-specific homes, one live board, execution tools.
 * Demoted (redirect): KPI Wall → Shift Dashboard, Supervisor Board → Live Board, Shift Overview → Shift Dashboard.
 */
export const OPERATIONS_NAV: NavDefinition[] = [
  { href: "/eaf/production-manager", label: "Production Hub", icon: Gauge, section: "operations", roles: [R.ProductionManager] },
  { href: "/eaf/plant-manager-board", label: "Plant Overview", icon: Building2, section: "operations", roles: [R.PlantManager] },
  { href: "/eaf/shift-dashboard", label: "Shift Analytics", icon: Gauge, section: "operations", roles: [...SUPERVISION, R.MaintenanceEngineer] },
  { href: "/eaf/live-board", label: "Live Board", icon: LayoutGrid, section: "operations", roles: SUPERVISION },
  { href: "/eaf/production-plan", label: "Production Plan", icon: CalendarRange, section: "operations", roles: PLANNING },
  { href: "/eaf/heat-queue", label: "Heat Queue", icon: ListOrdered, section: "operations", roles: SUPERVISION },
  { href: "/eaf/approvals", label: "Approvals", icon: ClipboardCheck, section: "operations", roles: SUPERVISION },
  { href: "/eaf/shift-handover", label: "Shift Handover", icon: Handshake, section: "operations", roles: [R.ShiftEngineer, R.ProductionManager] },
  { href: "/eaf/delays", label: "Delay Log", icon: Wrench, section: "operations", roles: [R.MaintenanceEngineer, R.ProductionManager, R.ShiftEngineer] },
  { href: "/eaf/calendar", label: "Plant Calendar", icon: CalendarDays, section: "operations", roles: [...SUPERVISION, R.MaintenanceEngineer, R.Admin] },
];

/**
 * Administration = IAM + plant config + platform only.
 * Announcements / Alerts / Search live under Tools (comms & find), not Admin.
 */
export const ADMIN_NAV: NavDefinition[] = [
  { href: "/eaf/admin", label: "Admin Dashboard", icon: Shield, section: "admin", roles: ADMIN_ONLY },
  { href: "/eaf/users", label: "User Management", icon: Users, section: "admin", roles: ADMIN_ONLY },
  { href: "/eaf/audit-log", label: "Audit Log", icon: ScrollText, section: "admin", roles: [R.Admin, R.PlantManager] },
  { href: "/eaf/furnaces", label: "Furnaces", icon: Factory, section: "admin", roles: PLANNING },
  { href: "/eaf/shifts", label: "Shift Management", icon: Clock, section: "admin", roles: [...PLANNING, R.ShiftEngineer] },
  { href: "/eaf/settings", label: "Settings", icon: Settings, section: "admin", roles: [R.Admin, R.PlantManager] },
  { href: "/eaf/session-backup", label: "Session Backup", icon: HardDrive, section: "admin", roles: ADMIN_ONLY },
];

/** Research — science roles; Admin removed from default sidebar noise. */
export const RESEARCH_NAV: NavDefinition[] = [
  { href: "/eaf/model", label: "Model Insights", icon: LineChart, section: "research", roles: RESEARCH_ROLES },
  { href: "/eaf/optimizer?mode=research", label: "Optimizer V2", icon: FlaskConical, section: "research", roles: RESEARCH_ROLES },
  { href: "/eaf/reliability", label: "Reliability", icon: BarChart3, section: "research", roles: RESEARCH_ROLES },
  { href: "/eaf/digital-twin-readiness", label: "Digital Twin", icon: Cpu, section: "research", roles: RESEARCH_ROLES },
  {
    href: "/eaf/research",
    label: "Research Center",
    icon: FlaskConical,
    section: "research",
    roles: RESEARCH_ROLES,
    children: [
      { href: "/eaf/research", label: "Overview", icon: FlaskConical, roles: RESEARCH_ROLES },
      { href: "/eaf/research/leakage", label: "Leakage Analysis", icon: ShieldAlert, roles: RESEARCH_ROLES },
      { href: "/eaf/research/evolution", label: "Model Evolution", icon: GitBranch, roles: RESEARCH_ROLES },
      { href: "/eaf/research/two-stage", label: "Two-stage Architecture", icon: Layers, roles: RESEARCH_ROLES },
      { href: "/eaf/research/features", label: "Feature Discovery", icon: Sparkles, roles: RESEARCH_ROLES },
      { href: "/eaf/research/roadmap", label: "Industrial Roadmap", icon: Map, roles: RESEARCH_ROLES },
      { href: "/eaf/research/data-collection", label: "Future Data Collection", icon: Database, roles: RESEARCH_ROLES },
      { href: "/eaf/research/comparison", label: "Production vs Research", icon: Scale, roles: RESEARCH_ROLES },
    ],
  },
];

/** Compliance audits for managers; platform docs/deploy demoted to DataScientist/Admin only. */
export const ENTERPRISE_NAV: NavDefinition[] = [
  { href: "/eaf/audit/predictions", label: "Prediction Audit", icon: ScrollText, section: "enterprise", roles: [R.Admin, R.PlantManager, R.ProductionManager] },
  { href: "/eaf/audit/recommendations", label: "Recommendation Audit", icon: ClipboardList, section: "enterprise", roles: [R.Admin, R.PlantManager, R.ProductionManager] },
  { href: "/eaf/validation-center", label: "Validation Metrics", icon: CheckCircle2, section: "enterprise", roles: [R.QualityEngineer, R.ProductionManager] },
  { href: "/eaf/explainability", label: "Explainability", icon: FileSearch, section: "enterprise", roles: RESEARCH_ROLES },
  { href: "/eaf/versions", label: "Version Control", icon: GitBranch, section: "enterprise", roles: [R.Admin, R.DataScientist] },
  { href: "/eaf/docs", label: "Documentation", icon: BookOpen, section: "enterprise", roles: [R.Admin, R.DataScientist] },
  { href: "/eaf/deployment-readiness", label: "Deployment Readiness", icon: ShieldAlert, section: "enterprise", roles: [R.Admin, R.DataScientist] },
  { href: "/eaf/performance", label: "Performance", icon: Gauge, section: "enterprise", roles: [R.Admin, R.DataScientist] },
];

/**
 * Tools — exploration + plant comms (not Admin dumping ground).
 * System Health stays Admin+ deep-link only (covered by Admin Dashboard).
 */
export const TOOLS_NAV: NavDefinition[] = [
  { href: "/eaf/whatif", label: "What-if", icon: Sparkles, section: "tools", roles: FLOOR },
  { href: "/eaf/historical", label: "Historical Analysis", icon: Database, section: "tools", roles: [...SUPERVISION, R.DataScientist, R.QualityEngineer] },
  { href: "/eaf/health", label: "Process Health", icon: Activity, section: "tools", roles: [...SUPERVISION, R.MaintenanceEngineer] },
  { href: "/eaf/announcements", label: "Announcements", icon: Megaphone, section: "tools", roles: [...PLANNING, R.ShiftEngineer, R.Operator, R.Viewer] },
  { href: "/eaf/alerts", label: "Alerts", icon: AlertTriangle, section: "tools", roles: [...SUPERVISION, R.MaintenanceEngineer, R.QualityEngineer, R.Admin] },
  { href: "/eaf/search", label: "Search", icon: Search, section: "tools", roles: [...SUPERVISION, R.Admin, R.Viewer] },
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
  { id: "predict", label: "Predict TTT", href: "/eaf/prediction", shortcut: "P", roles: FLOOR },
  { id: "optimize", label: "Optimizer", href: "/eaf/optimizer", shortcut: "O", roles: FLOOR },
  { id: "validation", label: "Validation", href: "/eaf/validation", shortcut: "V", roles: [...FLOOR, R.QualityEngineer] },
  { id: "history", label: "Heat History", href: "/eaf/heat-history", shortcut: "H", roles: [...FLOOR, R.PlantManager, R.QualityEngineer, R.Viewer] },
  { id: "whatif", label: "What-if", href: "/eaf/whatif", shortcut: "W", roles: FLOOR },
  { id: "reports", label: "Reports", href: "/eaf/reports", roles: [...FLOOR, R.PlantManager, R.QualityEngineer, R.Viewer] },
  { id: "admin", label: "Admin Dashboard", href: "/eaf/admin", roles: ADMIN_ONLY },
  { id: "live-board", label: "Live Board", href: "/eaf/live-board", roles: SUPERVISION },
  { id: "shift-dashboard", label: "Shift Dashboard", href: "/eaf/shift-dashboard", roles: SUPERVISION },
];

/** Routes Operators may open (deep-link allowlist). Do not widen casually. */
export const OPERATOR_CONSOLE_ROUTES = [
  "/eaf/prediction",
  "/eaf/optimizer",
  "/eaf/validation",
  "/eaf/heat-history",
  "/eaf/reports",
  "/eaf/whatif",
  "/eaf/about",
  "/eaf/announcements",
] as const;

export function flattenNavItems(items: NavDefinition[] = ALL_NAV_ITEMS): NavDefinition[] {
  return items.flatMap((item) => [item, ...(item.children ? flattenNavItems(item.children) : [])]);
}

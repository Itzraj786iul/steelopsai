import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Bot,
  Building2,
  FileText,
  Key,
  Layers,
  Palette,
  Server,
  Shield,
  Sparkles,
  Users,
} from "lucide-react";

export type IntegrationStatus = "connected" | "pending" | "offline";

export interface IntegrationDef {
  id: string;
  name: string;
  category: string;
  status: IntegrationStatus;
  description: string;
}

export const INTEGRATIONS: IntegrationDef[] = [
  { id: "sap", name: "SAP ERP", category: "ERP", status: "connected", description: "Production orders and material master" },
  { id: "mes", name: "MES", category: "Manufacturing", status: "connected", description: "Heat scheduling and execution" },
  { id: "scada", name: "SCADA", category: "Operations", status: "connected", description: "Real-time furnace telemetry" },
  { id: "lims", name: "LIMS", category: "Quality", status: "pending", description: "Chemistry and grade validation" },
  { id: "historian", name: "Historian", category: "Data", status: "connected", description: "Time-series process data" },
  { id: "mqtt", name: "MQTT", category: "IoT", status: "connected", description: "Edge sensor streaming" },
  { id: "opcua", name: "OPC-UA", category: "Industrial", status: "pending", description: "PLC and DCS connectivity" },
  { id: "csv", name: "CSV Import", category: "Data", status: "connected", description: "Batch file ingestion" },
  { id: "rest", name: "REST API", category: "Integration", status: "connected", description: "Custom system connectors" },
];

export interface HealthMetric {
  id: string;
  label: string;
  status: "healthy" | "warning" | "critical" | "pending";
  value: string;
  detail: string;
}

export function buildCustomerHealth(): HealthMetric[] {
  return [
    { id: "install", label: "Installation progress", status: "healthy", value: "85%", detail: "Wizard and plant config complete" },
    { id: "api", label: "API connectivity", status: "healthy", value: "Online", detail: "All core endpoints responding" },
    { id: "model", label: "Model health", status: "healthy", value: "91.2%", detail: "Foundation model accuracy within SLA" },
    { id: "data", label: "Data completeness", status: "warning", value: "78%", detail: "LIMS integration pending" },
    { id: "live", label: "Live data status", status: "healthy", value: "Streaming", detail: "SCADA + MQTT active" },
    { id: "predict", label: "Prediction readiness", status: "healthy", value: "Ready", detail: "12 heats forecast available" },
  ];
}

export interface ReadinessCheck {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | "pending";
  version?: string;
  detail: string;
}

export function buildReleaseReadiness(): ReadinessCheck[] {
  return [
    { id: "frontend", label: "Frontend build", status: "pass", version: "2.0.0", detail: "Next.js production bundle" },
    { id: "backend", label: "Backend", status: "pass", version: "1.4.2", detail: "API gateway healthy" },
    { id: "database", label: "Database", status: "pass", detail: "PostgreSQL replication OK" },
    { id: "foundation", label: "Foundation Model", status: "pass", version: "SIFM v3.1", detail: "Inference latency 120ms p95" },
    { id: "apis", label: "APIs", status: "pass", detail: "OpenAPI contract validated" },
    { id: "websocket", label: "WebSocket", status: "pass", detail: "Live telemetry channel active" },
    { id: "monitoring", label: "Monitoring", status: "warn", detail: "Alert routing pending for shift C" },
    { id: "deployment", label: "Deployment", status: "pass", detail: "Kubernetes rollout stable" },
  ];
}

export interface TrainingPath {
  id: string;
  title: string;
  audience: "operator" | "engineer" | "manager" | "executive";
  durationMin: number;
  modules: number;
  description: string;
}

export const TRAINING_PATHS: TrainingPath[] = [
  { id: "op-basics", title: "Operator fundamentals", audience: "operator", durationMin: 25, modules: 6, description: "Mission workspace, approvals, live heat" },
  { id: "eng-twin", title: "Digital twin & recipes", audience: "engineer", durationMin: 40, modules: 8, description: "Twin playback, recipe deltas, SHAP" },
  { id: "mgr-shift", title: "Shift leadership", audience: "manager", durationMin: 30, modules: 5, description: "Control tower, approvals queue, handover" },
  { id: "exec-board", title: "Executive command center", audience: "executive", durationMin: 20, modules: 4, description: "Financial story, ROI, board mode" },
];

export interface TourStep {
  id: string;
  title: string;
  description: string;
  href: string;
  selector?: string;
}

export const PRODUCT_TOUR_STEPS: TourStep[] = [
  { id: "dashboard", title: "Today's Mission", description: "Your daily briefing — priorities, savings, and AI coach.", href: "/dashboard" },
  { id: "copilot", title: "Mission Workspace", description: "Review AI recommendations and approve recipe changes.", href: "/copilot" },
  { id: "control", title: "Mission Queue", description: "Plant-wide priority queue and heat funnel.", href: "/insights/control-tower" },
  { id: "twin", title: "Digital Twin", description: "Simulate heats before execution.", href: "/preheat" },
  { id: "live", title: "Live Heat", description: "Real-time furnace control room.", href: "/live" },
  { id: "executive", title: "Executive Center", description: "Boardroom financial story and ROI.", href: "/executive" },
  { id: "agents", title: "Agents", description: "Collaborative AI agents for tasks and war room.", href: "/collaboration/agents" },
  { id: "learning", title: "Learning", description: "Captured lessons and root cause intelligence.", href: "/knowledge/lessons" },
];

export interface SettingsSection {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const SETTINGS_SECTIONS: SettingsSection[] = [
  { id: "plant", title: "Plant", description: "Furnaces, shifts, targets", href: "/settings/org", icon: Building2 },
  { id: "users", title: "Users", description: "Roles and access", href: "/settings/users", icon: Users },
  { id: "licenses", title: "Licenses", description: "Subscription and entitlements", href: "/settings/licenses", icon: Key },
  { id: "integrations", title: "Integrations", description: "SAP, MES, SCADA, and more", href: "/settings/integrations", icon: Layers },
  { id: "notifications", title: "Notifications", description: "Alerts and digests", href: "/settings/notifications", icon: Bell },
  { id: "ai", title: "AI Preferences", description: "Confidence thresholds and modes", href: "/settings/ai-preferences", icon: Bot },
  { id: "reports", title: "Reports", description: "Scheduled exports", href: "/settings/reports", icon: FileText },
  { id: "appearance", title: "Appearance", description: "Theme and density", href: "/settings/appearance", icon: Palette },
];

export interface HelpArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  { id: "getting-started", title: "Getting started", category: "Onboarding", summary: "Install, configure, and run your first demo" },
  { id: "mission-workflow", title: "Mission workflow", category: "Operations", summary: "From briefing to approval to live execution" },
  { id: "digital-twin", title: "Digital twin guide", category: "Engineering", summary: "Simulate and compare recipe scenarios" },
  { id: "executive-dashboard", title: "Executive dashboard", category: "Leadership", summary: "Financial story and board presentation" },
  { id: "integrations", title: "Integration setup", category: "IT", summary: "Connect SAP, MES, SCADA, and historians" },
  { id: "troubleshooting", title: "Troubleshooting", category: "Support", summary: "Common issues and resolution steps" },
];

export const KEYBOARD_SHORTCUTS = [
  { keys: "⌘ K", action: "Command palette" },
  { keys: "T", action: "Today's Mission" },
  { keys: "C", action: "Mission Workspace" },
  { keys: "L", action: "Live floor" },
  { keys: "A", action: "Approvals" },
  { keys: "?", action: "Help center" },
];

export const WIZARD_STEPS = [
  { id: "plant", title: "Plant details" },
  { id: "furnaces", title: "Furnaces" },
  { id: "shifts", title: "Shift configuration" },
  { id: "materials", title: "Material names" },
  { id: "targets", title: "Target heat time" },
  { id: "goals", title: "Business goals" },
  { id: "integrations", title: "Integrations" },
  { id: "finish", title: "Finish" },
] as const;

export const ONBOARDING_STATUS_ITEMS = [
  { id: "plant", label: "Plant setup", icon: Building2 },
  { id: "license", label: "License", icon: Shield },
  { id: "systems", label: "Connected systems", icon: Server },
  { id: "ai", label: "AI readiness", icon: Sparkles },
] as const;

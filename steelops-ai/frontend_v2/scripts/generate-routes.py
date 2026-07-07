"""Generate platform route stub pages for Sprint 1."""
from pathlib import Path

ROUTES = [
    ("today", "Today", "Daily operational command center"),
    ("heats", "Heats", "Browse and manage all heats"),
    ("heats/queue", "Heat Queue", "Upcoming scheduled heats"),
    ("heats/active", "Active Heats", "Currently running heats"),
    ("heats/history", "Heat History", "Completed heats archive"),
    ("preheat/new", "Pre-Heat Analysis", "Start unified intelligence pipeline"),
    ("preheat/compare", "Recipe Compare", "Side-by-side recipe comparison"),
    ("live/floor", "Live Floor", "Real-time furnace floor dashboard"),
    ("live/alerts", "Live Alerts", "Consolidated alert management"),
    ("shift/handover", "Shift Handover", "End-of-shift summary"),
    ("planning/schedule", "Production Schedule", "Multi-heat optimized schedule"),
    ("planning/inventory", "Inventory", "Material availability"),
    ("planning/scenarios", "Scenario Planner", "What-if production scenarios"),
    ("approvals", "Approvals", "Central approval queue"),
    ("insights/control-tower", "Control Tower", "Plant-wide operational command"),
    ("insights/shift", "Shift Intelligence", "Shift-level performance analytics"),
    ("insights/quality", "Quality Insights", "GREEN quality analytics"),
    ("insights/energy", "Energy Insights", "Power and energy analytics"),
    ("insights/forecast", "Forecast", "Production forecast"),
    ("insights/maintenance", "Maintenance", "Maintenance impact on schedule"),
    ("insights/plant-control", "Plant Control", "Unified plant control surface"),
    ("knowledge/lessons", "Knowledge Lessons", "Engineering lessons library"),
    ("knowledge/search", "Knowledge Search", "Industrial memory search"),
    ("knowledge/root-cause", "Root Cause", "Production incident investigation"),
    ("knowledge/graph", "Knowledge Graph", "Visual process knowledge"),
    ("executive", "Executive Dashboard", "Leadership KPI overview"),
    ("executive/ai", "Executive AI", "Natural language executive briefing"),
    ("executive/reports", "Reports", "Generate and download reports"),
    ("executive/multi-plant", "Multi-Plant", "Corporate multi-site view"),
    ("collaboration/war-room", "War Room", "Incident collaboration"),
    ("collaboration/tasks", "Tasks", "Agent and human task queue"),
    ("collaboration/agents", "Agents", "AI agent management"),
    ("labs/optimization", "Optimization Lab", "Advanced what-if optimization"),
    ("labs/simulation", "Simulation Lab", "Monte Carlo simulation"),
    ("settings", "Enterprise Settings", "License and branding"),
    ("settings/org", "Organization", "Tenant org hierarchy"),
    ("settings/users", "Users & Roles", "User management RBAC"),
    ("settings/governance", "Governance & Audit", "Compliance audit trail"),
    ("settings/governance/models", "Model Governance", "ML deployment governance"),
    ("settings/integrations", "Integrations", "Connectors and event topics"),
    ("settings/developer", "Developer Portal", "API keys and usage"),
    ("settings/readiness", "Readiness", "Platform readiness score"),
    ("notifications", "Notifications", "All notifications inbox"),
    ("profile", "Profile", "Personal preferences"),
    ("onboarding", "Onboarding", "First-time plant setup"),
]

TEMPLATE = '''import {{ RoutePlaceholder }} from "@/components/layout/route-placeholder";

export default function Page() {{
  return (
    <RoutePlaceholder
      title="{title}"
      description="{description}"
    />
  );
}}
'''

root = Path("src/app/(platform)")
for route, title, desc in ROUTES:
    page_dir = root / route
    page_dir.mkdir(parents=True, exist_ok=True)
    (page_dir / "page.tsx").write_text(
        TEMPLATE.format(title=title, description=desc), encoding="utf-8"
    )

print(f"Generated {len(ROUTES)} route pages")

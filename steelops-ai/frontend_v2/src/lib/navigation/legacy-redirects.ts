/** Maps legacy SteelOps routes to the JSPL EAF product. */

const EXACT_REDIRECTS: Record<string, string> = {
  "/dashboard": "/eaf/dashboard",
  "/today": "/eaf/dashboard",
  "/decision-package": "/eaf/prediction",
  "/copilot": "/eaf/prediction",
  "/preheat": "/eaf/prediction",
  "/recipes": "/eaf/optimizer",
  "/labs/optimization": "/eaf/optimizer",
  "/labs/simulation": "/eaf/whatif",
  "/insights/control-tower": "/eaf/historical",
  "/insights/shift": "/eaf/historical",
  "/insights/quality": "/eaf/health",
  "/insights/energy": "/eaf/health",
  "/insights/forecast": "/eaf/historical",
  "/insights/maintenance": "/eaf/health",
  "/insights/plant-control": "/eaf/historical",
  "/live": "/eaf/health",
  "/live/floor": "/eaf/health",
  "/heats": "/eaf/historical",
  "/heats/active": "/eaf/historical",
  "/heats/history": "/eaf/historical",
  "/heats/queue": "/eaf/historical",
  "/executive": "/eaf/dashboard",
  "/executive/ai": "/eaf/model",
  "/executive/reports": "/eaf/reports",
  "/executive/multi-plant": "/eaf/dashboard",
  "/settings": "/eaf/model",
  "/settings/readiness": "/eaf/about",
  "/settings/training": "/eaf/about",
  "/help": "/eaf/about",
  "/onboarding": "/eaf/about",
  "/profile": "/eaf/dashboard",
  "/notifications": "/eaf/dashboard",
  "/approvals": "/eaf/dashboard",
  "/knowledge/lessons": "/eaf/about",
  "/knowledge/search": "/eaf/about",
  "/knowledge/root-cause": "/eaf/about",
  "/knowledge/graph": "/eaf/about",
  "/planning/schedule": "/eaf/historical",
  "/planning/inventory": "/eaf/historical",
  "/planning/scenarios": "/eaf/whatif",
  "/collaboration/war-room": "/eaf/dashboard",
  "/collaboration/tasks": "/eaf/dashboard",
  "/collaboration/agents": "/eaf/model",
  "/shift/handover": "/eaf/historical",
};

const PREFIX_REDIRECTS: Array<{ prefix: string; target: string }> = [
  { prefix: "/preheat/", target: "/eaf/prediction" },
  { prefix: "/heat/", target: "/eaf/prediction" },
  { prefix: "/live/", target: "/eaf/health" },
  { prefix: "/heats/", target: "/eaf/historical" },
  { prefix: "/insights/", target: "/eaf/historical" },
  { prefix: "/recipes/", target: "/eaf/optimizer" },
  { prefix: "/settings/", target: "/eaf/model" },
  { prefix: "/executive/", target: "/eaf/dashboard" },
  { prefix: "/knowledge/", target: "/eaf/about" },
  { prefix: "/planning/", target: "/eaf/historical" },
  { prefix: "/collaboration/", target: "/eaf/dashboard" },
  { prefix: "/labs/", target: "/eaf/optimizer" },
];

export function resolveLegacyRedirect(pathname: string): string | null {
  if (pathname.startsWith("/eaf")) return null;

  const exact = EXACT_REDIRECTS[pathname];
  if (exact) return exact;

  for (const { prefix, target } of PREFIX_REDIRECTS) {
    if (pathname.startsWith(prefix)) return target;
  }

  return null;
}

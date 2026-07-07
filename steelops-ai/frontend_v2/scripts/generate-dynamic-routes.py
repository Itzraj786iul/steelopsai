"""Generate dynamic route stub pages."""
from pathlib import Path

DYNAMIC_ROUTES = [
    ("heats/[heatId]", "Heat Detail", "Master record for a single heat"),
    ("heats/[heatId]/learning", "Post-Heat Learning", "Capture outcome vs prediction"),
    ("preheat/[heatId]", "Pre-Heat Decision Package", "Unified orchestrator output"),
    ("preheat/[heatId]/twin", "Digital Twin", "Stage-by-stage simulation"),
    ("preheat/[heatId]/evidence", "Evidence", "Historical evidence and validation"),
    ("preheat/[heatId]/approve", "Approval Gate", "Human approval before charge"),
    ("preheat/[heatId]/start", "Heat Start", "Final confirmation before charge"),
    ("live/[heatId]", "Live Heat Detail", "Deep live monitoring"),
    ("live/[heatId]/timeline", "Live Timeline", "Process stage timeline"),
    ("approvals/[id]", "Approval Detail", "Single approval with full context"),
    ("insights/replay/[runId]", "Prediction Replay", "Replay historical prediction run"),
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
for route, title, desc in DYNAMIC_ROUTES:
    page_dir = root / route
    page_dir.mkdir(parents=True, exist_ok=True)
    (page_dir / "page.tsx").write_text(TEMPLATE.format(title=title, description=desc), encoding="utf-8")

print(len(DYNAMIC_ROUTES))

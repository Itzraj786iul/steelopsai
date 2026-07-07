# Mission Control Specification

**Route:** `/insights/control-tower`  
**Component:** `MissionControlView`

## Purpose

Shift-wide oversight — not analytics. Answers: *What is the plant doing right now and what needs intervention?*

## Layout

### Header
- Title: Plant operations
- AI objective line from briefing
- CTA: Live floor

### Shift timeline
`ExecutionTimeline` — Prediction → Recommendation → Approval → Execution → Actual → Learning

### Plant status (grid)
- EAF lines, LF, Caster
- Approvals queue state
- AI engine health

### AI summary panel
- Opportunities (green bullets)
- Risks (amber bullets)

### Priority queue (table)
AI-ranked heats with:
- Priority score
- Business value (INR)
- Confidence (plain language)
- Deadline (planned start)
- Operator impact
- Risk band

## Data sources (existing APIs)

| Data | API |
|------|-----|
| Schedule | `plantApi.scheduling(shift)` |
| Heats | `heatsApi.list(PLANNED)` |
| Approvals | `agentsApi.approvals(PENDING)` |
| Active package | `usePreheatStore` |

## Scoring

`buildMissionHeats()` — priority = f(schedule order, AI readiness, minutes to save, business value proxy).

## Future (no API change required)

- Live alert feed from `/live/alerts`
- Weather / inventory warnings in briefing panel

## Accessibility

- Table with semantic `role="table"`
- Status cells with color + text (not color alone)

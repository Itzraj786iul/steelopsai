# Demo Mode Specification

## Overview

Demo mode showcases the full SteelOps AI workflow **without live plant data** or backend changes. All scenarios use client-seeded event scripts.

## Entry points

1. **Onboarding → Demo mode** — `Run interactive demo` (scenario `full-day`)
2. **Onboarding → Demo library** — 7 one-click scenarios
3. **Demo banner** — visible app-wide while demo is active

## Full-day scenario (`full-day`)

12 scripted events covering:

| Phase | Route | Content |
|-------|-------|---------|
| Morning briefing | `/dashboard` | 12 heats scheduled |
| AI predictions | `/copilot` | Foundation model forecasts |
| Operator review | `/copilot` | Pending approvals |
| Approval | `/approvals` | Recipe delta accepted |
| Digital twin | `/preheat` | Twin validation |
| Live execution | `/live` | Heat in progress |
| Mission control | `/insights/control-tower` | Queue update |
| Learning | `/knowledge/lessons` | Lesson captured |
| Agents | `/collaboration/agents` | Optimization agent |
| Executive | `/executive` | Daily savings |
| Shift handover | `/shift/handover` | Shift A → B |
| Complete | — | Demo finished |

## Playback

- Auto-advances by `durationMs` per event
- Navigates to `href` when present
- Pause / resume / skip / exit via player UI and demo banner
- No API calls — existing pages render with live or fallback data

## Scenario library

| ID | Title |
|----|-------|
| `full-day` | Interactive product demo |
| `high-phosphorus` | High phosphorus heat |
| `fast-production` | Fast production day |
| `power-constrained` | Power constrained day |
| `inventory-shortage` | Inventory shortage |
| `maintenance` | Maintenance event |
| `shift-change` | Shift change |

## Store API

```typescript
useDemoStore.getState().startDemo("full-day");
useDemoStore.getState().stopDemo();
```

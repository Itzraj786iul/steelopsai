# Workflow Redesign — Sprint 3

## Old mental model

```
Dashboard → Copilot → Recipes → History → Settings
(feature silos, data-first)
```

## New mental model

```
Today → Mission → Live → Planning → Plant → Learning → Admin
(operator journey, action-first)
```

## Journey map

### 1. Start shift (Today)
- AI briefing: objective, bottlenecks, risks, opportunities
- Mission cards ranked by priority score
- **Start first heat** CTA → Copilot with heatId

### 2. Optimize heat (Mission)
- Decision flow: recipe → analysis → twin → recommendation → approval
- Expandable recommendation answers Why / What / How much / Risk / Confidence / Approver / Value / Evidence
- Approve → celebration → return to Today

### 3. Execute (Live)
- AI Coach: stable vs alert tone
- Focus mode: hide charts, show objective + coach + checklist
- Finish heat → learning captured → celebration

### 4. Plan ahead (Planning)
- Unchanged routes; nav groups under Planning

### 5. Oversee plant (Plant / Mission Control)
- Shift timeline, plant status grid, AI summary, priority queue

### 6. Learn (Learning)
- Plant intelligence timeline from completed heats

### 7. Admin
- Settings, users, governance (secondary nav + Admin pin)

## Route mapping (unchanged URLs)

| New label | Route | Was |
|-----------|-------|-----|
| Today | `/dashboard` | Today / Dashboard |
| Mission | `/copilot` | Copilot |
| Live | `/live` | Live |
| Planning | `/planning/schedule` | Planning |
| Plant | `/insights/control-tower` | Control Tower |
| Learning | `/knowledge/lessons` | Knowledge |
| Admin | `/settings` | Settings |

Legacy routes (`/heats`, `/preheat`, `/approvals`) remain in secondary nav and command palette.

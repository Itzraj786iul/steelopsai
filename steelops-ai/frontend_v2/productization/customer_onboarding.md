# Customer Onboarding — Sprint 5

**Route:** `/onboarding`  
**Goal:** Install SteelOps AI and understand value within one hour.

## First login flow

1. User signs in → redirected to `/onboarding` if welcome not completed
2. **Welcome experience** — plant status, license, systems, AI readiness
3. **Installation wizard** — 8 steps (plant → finish)
4. **Quick tour** or **Skip** — optional product tour overlay
5. User explores demo mode and training at their pace

## Hub sections

| Tab | Purpose |
|-----|---------|
| Welcome | First-run status and CTAs |
| Installation | Multi-step plant wizard |
| Demo mode | Auto-play full production day |
| Demo library | 7 scenario cards |
| Training | Role-based paths + badges |
| Health | Customer health dashboard |

## State

- `steelops-onboarding-v1` — welcome, wizard, tour, training progress
- `demo-store` — ephemeral demo playback (not persisted)

## Integration points

- Login form checks `needsWelcome()`
- App shell mounts `ProductTourOverlay` + `DemoBanner`
- Settings hub links to plant, licenses, integrations, etc.
- Help center at `/help`

## Components

```
features/onboarding/
├── utils/onboarding-data.ts
├── utils/demo-scenarios.ts
└── components/
    ├── onboarding-hub.tsx
    ├── welcome-experience.tsx
    ├── installation-wizard.tsx
    ├── demo-mode-player.tsx
    ├── demo-library.tsx
    ├── product-tour-overlay.tsx
    ├── customer-health-dashboard.tsx
    ├── integration-center.tsx
    ├── training-center.tsx
    ├── help-center.tsx
    ├── settings-hub.tsx
    ├── release-readiness-dashboard.tsx
    ├── demo-banner.tsx
    └── app-splash.tsx
```

# SteelOps AI — Design System v3 (Industrial UX Foundation)

Enterprise operating system aesthetic: Palantir Foundry × Linear × Siemens Insights Hub.

## Color palette

### Core (dark default)
| Token | HSL | Use |
|-------|-----|-----|
| `--background` | 222 14% 5% | App canvas |
| `--foreground` | 210 20% 98% | Primary text |
| `--card` | 222 12% 9% | Elevated surfaces |
| `--primary` | 24 100% 55% | Steel heat / brand |
| `--secondary` | 203 48% 58% | Industrial steel blue |
| `--accent` | 162 94% 43% | Success / GREEN |
| `--muted` | 222 8% 14% | Subtle fills |

### Semantic status
| Token | Color | Use |
|-------|-------|-----|
| `--success` | `#06D6A0` | GREEN heat, approvals |
| `--warning` | `#FBBF24` | Delays, medium confidence |
| `--critical` | `#F87171` | Alerts, emergencies |
| `--info` | `#60A5FA` | Informational |

### AI semantics
| Token | Use |
|-------|-----|
| `--ai-glow` | Copilot recommendation cards |
| `--prediction` | `#818CF8` | Forecast bands |
| `--confidence-high` | accent green |
| `--confidence-low` | warning amber |

## Typography scale
- **Display LG** — 2.25rem / 600 — Command center hero
- **Display MD** — 1.875rem / 600 — Page titles
- **Heading LG** — 1.5rem / 600 — Section heroes
- **Heading MD** — 1.25rem / 600 — Card titles
- **Label** — 0.75rem / 500 / uppercase — Metadata
- **Body** — 0.875rem — Default UI
- **Mono** — Geist Mono — Metrics, heat IDs

## Elevation
1. **Flat** — border only
2. **Raised** — `shadow-elevation-sm`
3. **Floating** — `shadow-elevation-md`
4. **Glow** — `shadow-glow-primary` (AI cards only)

## Glass surfaces
`.glass-panel` — `bg-card/60 backdrop-blur-md border-border/60`

## Spacing (8px grid)
- Page padding: `px-6 py-8` (md: `px-8`)
- Section gap: `gap-8`
- Card padding: `p-6`
- Compact: `p-4`

## Motion principles
- Duration: 150–250ms UI, 400ms page entrance
- Easing: `[0.22, 1, 0.36, 1]` (industrial ease-out)
- Respect `prefers-reduced-motion`
- No bounce / playful springs

## Themes
Light and dark via CSS variables in `globals.css`. Dark is production default for control-room use.

## Icons
Lucide, 16px inline, 20px nav, 24px empty states. Stroke 1.75.

## Badges
- Success → GREEN / approved
- Warning → pending / medium confidence  
- Critical → alert / reject
- Outline → neutral counts

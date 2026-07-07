# SteelOps AI Frontend v2

Enterprise SaaS frontend for SteelOps AI — the daily operating system for EAF steel production.

## Stack

- Next.js 15 · React 19 · TypeScript
- Tailwind CSS · Shadcn-style UI primitives
- TanStack Query · Zustand
- React Hook Form · Zod
- Framer Motion · Recharts · Lucide Icons
- FastAPI WebSocket realtime (native WS against existing backend)

## Sprint 1 Scope

Foundation only:

- App Router structure with full navigation shell
- Authentication (login, register, forgot password flow)
- AppShell (sidebar, header, breadcrumbs, plant/shift selectors)
- Command palette (⌘K)
- Notification center (derived from approvals + live heats APIs)
- Design tokens, providers, API client, RBAC utilities
- Error/offline/loading states
- Jest + React Testing Library baseline tests

Business modules (Today, Heats, Pre-Heat, Live, etc.) ship in later sprints as route shells only.

## Getting Started

### 1. Start the backend (Terminal 1)

From the repo root on Windows:

```powershell
cd "E:\JSPL INTERNSHIP\Data 2\steelops-ai"
.\scripts\start-local.ps1
```

This installs Python deps, initializes SQLite, seeds data, and starts the API at **http://localhost:8000** (Swagger: `/docs`).

### 2. Start frontend v2 (Terminal 2)

**Recommended** — use the helper script (cleans cache, frees port 3000):

```powershell
cd "E:\JSPL INTERNSHIP\Data 2\steelops-ai"
.\scripts\start-frontend-v2.ps1
```

Or manually:

```powershell
cd steelops-ai/frontend_v2
cp .env.example .env.local   # if missing
npm install
npm run dev:clean            # clears .next then starts dev server
```

Open [http://localhost:3000](http://localhost:3000).

> **Do not** run `npm run build` and `npm run dev` in the same terminal while another dev server is running — this corrupts `.next` and causes `/login` 404 errors.

Default credentials (seeded backend):

- Email: `admin@steelops.ai`
- Password: `SteelOps2026!`

### Troubleshooting

| Symptom | Fix |
|---------|-----|
| `/login` returns 404 | Stop all Node processes, run `npm run dev:clean` |
| `EPERM` on `.next/trace` | Close dev server, delete `.next`, restart with `dev:clean` |
| Port 3000 in use | `Get-NetTCPConnection -LocalPort 3000 \| ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }` |
| "Cannot reach the API" in UI | Start the backend (`start-local.ps1`) on port 8000 |
| `scripts/start-frontend.ps1` | Starts `frontend_v2/` (Release 1.0) |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run clean` | Remove `.next` build cache |
| `npm run dev` | Start development server |
| `npm run dev:clean` | Clean cache, then start dev server |
| `npm run build` | Production build |
| `npm run build:clean` | Clean cache, then production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Jest unit tests |
| `npm run format` | Prettier write |

## Environment

See `.env.example`.

## Docker

```bash
docker build -t steelops-frontend-v2 .
docker run -p 3000:3000 --env-file .env.local steelops-frontend-v2
```

## Architecture

See `productization/` for sprint specs and `../docs/architecture/repository_layout.md` for repo layout.
Legacy design blueprint: `../archive/legacy_design_documents/frontend_v2_design/`.

## Notes

- Release 1.0 active UI is `frontend_v2/`. Legacy v1 is archived under `../archive/legacy_frontend_v1/`.
- Realtime uses FastAPI native WebSocket endpoints (`/api/v1/ws/*`), not Socket.IO server endpoints.
- Password reset is administrator-mediated; no self-service backend endpoint exists yet.

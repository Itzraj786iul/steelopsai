# Deployment Readiness

## Routes

| Page | Purpose |
|------|---------|
| `/settings/readiness` | Release readiness dashboard |
| `/onboarding` → Health | Customer health dashboard |

## Release readiness checks

| System | Status source |
|--------|---------------|
| Frontend build | `APP_VERSION` constant |
| Backend | Static health proxy |
| Database | Static |
| Foundation Model | SIFM v3.1 label |
| APIs | OpenAPI validated |
| WebSocket | Live channel |
| Monitoring | Alert routing |
| Deployment | K8s rollout |

## Customer health metrics

| Metric | Description |
|--------|-------------|
| Installation progress | Welcome + wizard + tour completion |
| API connectivity | Core endpoints |
| Model health | Accuracy SLA |
| Data completeness | Integration coverage |
| Live data status | SCADA/MQTT |
| Prediction readiness | Forecast availability |

## Pilot checklist

1. Complete installation wizard
2. Verify integrations in Integration Center
3. Run full-day interactive demo
4. Complete training path for each role
5. Confirm release readiness ≥ 7/8 pass
6. Export executive snapshot for board review

## Branding assets

- `public/favicon.svg` — application icon
- `public/email/welcome.html` — welcome email template
- Root layout Open Graph metadata
- `AppSplash` — first-load branded screen

## Commercial positioning

Product presents as **Enterprise Pilot** license with 3 furnaces, 50 seats, and full mission + executive modules.

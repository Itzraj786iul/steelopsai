# Installation Wizard

## Route

`/onboarding` → **Installation** tab

## Steps

| # | Step | Fields |
|---|------|--------|
| 1 | Plant details | Plant name |
| 2 | Furnaces | Count (1–6) |
| 3 | Shift configuration | A, B, C toggles |
| 4 | Material names | Comma-separated list |
| 5 | Target heat time | Minutes |
| 6 | Business goals | Multi-select |
| 7 | Integrations | SAP, MES, SCADA, etc. |
| 8 | Finish | Summary + confirm |

## Persistence

Stored in `useOnboardingStore().installation` (localStorage `steelops-onboarding-v1`).

On finish:
- `wizardCompleted: true`
- Plant context set to `jspl-angul`

## Business goals options

- Reduce heat time
- Increase GREEN %
- Lower power cost
- Improve yield
- Reduce CO₂

## Integration selection

User selects from 9 integration cards (SAP, MES, SCADA, LIMS, Historian, MQTT, OPC-UA, CSV, REST). Selection is stored locally; actual connection is configured in **Settings → Integrations**.

## Re-run

Wizard can be re-run after completion to update configuration. Plant settings page (`/settings/org`) reflects saved values.

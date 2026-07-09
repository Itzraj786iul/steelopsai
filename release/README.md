# Release 1.0 Package

Industrial AI Decision Support System — JSPL EAF Tap-to-Tap.

## Quick commands

```bash
# Verify all APIs and consistency
python release/verify_release.py

# Generate PDFs, diagrams, and copy figures
python release/generate_release_assets.py

# Frontend build
cd steelops-ai/frontend_v2 && npm run build
```

## Deliverables

| File | Format |
|------|--------|
| `RELEASE_NOTES_v1.0.md` | Markdown |
| `VERIFICATION_CHECKLIST.md` | Markdown |
| `FINAL_TECHNICAL_REPORT.pdf` | PDF |
| `THESIS_APPENDIX.pdf` | PDF |
| `USER_MANUAL.pdf` | PDF |
| `API_REFERENCE.pdf` | PDF |
| `SYSTEM_ARCHITECTURE.pdf` | PDF |
| `DEPLOYMENT_GUIDE.pdf` | PDF |
| `figures/architecture/` | PNG, SVG |
| `figures/thesis/` | PNG |
| `figures/publication/` | PNG |
| `verification_results.json` | JSON (auto-generated) |

## Version

Product: **1.0.0** | Model: Phase 19 | Optimizer: Phase 20.2 | Research: Phase 33 (frozen)

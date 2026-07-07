# JSPL EAF TTT — Production Frontend

The production web interface lives in:

```
../steelops-ai/frontend_v2/
```

Phase 22 integrates the frozen ML pipeline (Phases 19 + 20.2) into the existing SteelOps design system without rebuilding the UI.

## Run

```bash
# Terminal 1 — ML API (port 8001)
cd ../backend
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Terminal 2 — Frontend (port 3000)
cd ../steelops-ai/frontend_v2
npm install
# Set in .env.local:
# NEXT_PUBLIC_EAF_API_URL=http://localhost:8001
npm run dev
```

## EAF Routes

| Route | Page |
|-------|------|
| `/` | Landing (JSPL hero) |
| `/eaf/dashboard` | KPI dashboard |
| `/eaf/prediction` | TTT prediction |
| `/eaf/optimizer` | Recipe optimizer |
| `/eaf/whatif` | What-if analysis |
| `/eaf/historical` | Historical analytics |
| `/eaf/health` | Process health gauges |
| `/eaf/model` | Model information |
| `/eaf/about` | Pipeline & research |
| `/eaf/reports` | Downloads |

Streamlit (`research/phase_21_streamlit_app`) remains a prototype only.

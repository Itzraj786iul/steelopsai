# JSPL EAF TTT — Production Frontend

The production web interface lives in:

```
../steelops-ai/frontend_v2/
```

Version **2.5.0** — unified JSPL EAF decision support platform (Phase 22.5).

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

## Routes

| Route | Page |
|-------|------|
| `/` | Landing |
| `/eaf/dashboard` | Executive dashboard |
| `/eaf/prediction` | TTT prediction |
| `/eaf/optimizer` | Recipe optimizer |
| `/eaf/whatif` | What-if analysis |
| `/eaf/historical` | Historical analysis |
| `/eaf/health` | Process health |
| `/eaf/model` | Model insights |
| `/eaf/reports` | Reports & downloads |
| `/eaf/settings` | Settings |
| `/eaf/about` | About & documentation |

Streamlit (`research/phase_21_streamlit_app`) remains a prototype only.

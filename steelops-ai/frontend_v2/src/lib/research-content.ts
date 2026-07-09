/** Static research content for Research Center — presentation only; production ML frozen. */

export const RESEARCH_PHASES = [
  {
    id: "16",
    title: "Phase 16 — Feature Engineering",
    contribution: "Normal-heat cohort (TTT ≤ 60) and industrial feature dictionary",
    accuracy: "Foundation for Phase 19",
    finding: "Separating NORMAL heats is essential for honest regression metrics",
  },
  {
    id: "19",
    title: "Phase 19 — Production Model",
    contribution: "Frozen StackingRegressor, 22 features, deployed prediction engine",
    accuracy: "MAE ≈ 3.06 min (random split, normal heats)",
    finding: "Deployed production predictor — must remain unchanged until industrial validation",
  },
  {
    id: "20",
    title: "Phase 20 — Recipe Optimizer",
    contribution: "Physics-guided optimizer constrained by plant practice",
    accuracy: "Uses Phase 19 predictions",
    finding: "Optimizer inherits production feature semantics including electrical energy",
  },
  {
    id: "23",
    title: "Phase 23 — Scientific Review",
    contribution: "Literature cause–effect map for EAF TTT drivers",
    accuracy: "—",
    finding: "Confirmed POWER field is end-of-heat electrical energy (kWh), not MW power",
  },
  {
    id: "23.5",
    title: "Phase 23.5 — Causal Feature Audit",
    contribution: "Temporal availability audit of all production features",
    accuracy: "—",
    finding: "HM×Energy and Energy/tonne are retrospective leakage risks for planning-time use",
  },
  {
    id: "24",
    title: "Phase 24 — Leakage-Free Model",
    contribution: "Planning-safe feature set without EE_KWH derivatives",
    accuracy: "Collapsed when mixed with delay heats (~25–36 min MAE)",
    finding: "Protocol mismatch: full population vs normal-only training",
  },
  {
    id: "24.5",
    title: "Phase 24.5 — Root Cause Validation",
    contribution: "Isolated leakage vs cohort vs temporal split effects",
    accuracy: "LF on normal cohort ≈ 3.27 min MAE",
    finding: "Performance collapse was mainly training-population mismatch, not FE bugs",
  },
  {
    id: "25",
    title: "Phase 25 — Two-Stage Architecture",
    contribution: "Regime classifier + normal-heat leakage-free regression",
    accuracy: "Normal CatBoost ~3.64 temporal; pipeline MAE ~16 vs single ~36",
    finding: "Delay detection is weak (~22% recall) without event/SCADA tags",
  },
  {
    id: "26",
    title: "Phase 26 — Feature Discovery",
    contribution: "35 physically motivated candidates; gold feature tier",
    accuracy: "Best ≈ 3.24 min (Δ ≈ −0.04 vs Phase 25)",
    finding: "Information ceiling on existing columns — need new measurements",
  },
  {
    id: "27",
    title: "Phase 27 — Data Gap Analysis",
    contribution: "MES/SCADA recommendations and digital-twin roadmap",
    accuracy: "Sub-2.5 min plausible only after P0 sensors",
    finding: "Priority: delay codes, power-on/off, metallization, restriction flag",
  },
];

export const PROD_VS_RESEARCH = [
  {
    dimension: "Prediction Model",
    production: "Phase 19 StackingRegressor (frozen)",
    research: "Phase 25/26 leakage-free LightGBM / CatBoost (experimental)",
  },
  {
    dimension: "Features",
    production: "22 features including energy interactions",
    research: "Planning-safe features + Phase 26 gold set (no EE_KWH inputs)",
  },
  {
    dimension: "Leakage",
    production: "Uses retrospective Electrical Energy (kWh) features",
    research: "Explicitly removes EE_KWH-derived predictors",
  },
  {
    dimension: "MAE (normal heats)",
    production: "≈ 3.06 min (historical random protocol)",
    research: "≈ 3.24–3.64 min depending on split / model",
  },
  {
    dimension: "Split / cohort",
    production: "Trained on normal TTT≤60 cohort",
    research: "Two-stage: classify abnormal, regress normals",
  },
  {
    dimension: "Deployment",
    production: "Live FastAPI + Next.js website",
    research: "Offline research folders only (Phases 23–27)",
  },
  {
    dimension: "Status",
    production: "PRODUCTION — deployed",
    research: "EXPERIMENTAL — not for live decisions",
  },
  {
    dimension: "Recommendation",
    production: "Continue until shadow-validated replacement",
    research: "Instrument P0 data, then shadow-deploy two-stage",
  },
];

export const RESEARCH_PAGES = {
  overview: {
    title: "Research Overview",
    summary:
      "Phases 23–27 established that Electrical Energy (kWh) is retrospective, that mixing delay heats destroys regression MAE, and that further gains require new plant measurements—not more algorithms on the same columns.",
  },
  leakage: {
    title: "Leakage Analysis",
    bullets: [
      "JSPL confirmed POWER = Electrical Energy Consumed (kWh), recorded after heat completion.",
      "HM × Electrical Energy and Energy/tonne encode realized duration — planning-time leakage risk.",
      "Production model still uses these features; UI now labels them correctly and documents the risk.",
      "Research models (Phases 24–26) demonstrate honest performance without EE_KWH inputs.",
    ],
  },
  evolution: {
    title: "Model Evolution",
    bullets: [
      "Phase 19 delivered deployable accuracy on normal heats.",
      "Phase 24 leakage-free training on all heats looked like a collapse until Phase 24.5 explained cohort mismatch.",
      "Phase 25 two-stage cut plant-level MAE roughly in half vs mixed single-model baselines.",
      "Phase 26 gold features add only ~0.04 min — information ceiling reached.",
    ],
  },
  twoStage: {
    title: "Two-stage Architecture",
    bullets: [
      "Stage 1: NORMAL vs ABNORMAL classifier (best F1 LightGBM; recall still ~22–43%).",
      "Stage 2: Leakage-free regression on TTT ≤ 60 only.",
      "Shutdown duration regression is not recommended — alert only.",
      "Requires delay codes / power-on tags before production cutover.",
    ],
  },
  features: {
    title: "Feature Discovery",
    bullets: [
      "35 metallurgical candidates (entropy, foam proxies, slag chemistry proxies, regime flags).",
      "Top new robustness: LOG_OXYGEN, LOG_SOLID_BURDEN, SCRAP_CARBON_OXYGEN.",
      "Operating regimes: oversize charge and high scrap elevate mean TTT.",
      "Derived remakes of HM/DRI/O₂ cannot invent delay physics.",
    ],
  },
  roadmap: {
    title: "Industrial Roadmap",
    bullets: [
      "12 months: P0 MES/SCADA (delays, power-on/off, waits, restriction) + shadow v2.",
      "3 years: quality labs, injection profiles, live twin, closed-loop optimizer with human confirm.",
      "Do not chase MAE by reintroducing EE_KWH into planning models.",
    ],
  },
  digitalTwin: {
    title: "Digital Twin",
    bullets: [
      "V1: Current production (this website).",
      "V2: Planning + SCADA/MES tags.",
      "V3: Real-time residual TTT + delay early warning.",
      "V4: Closed-loop recipe recommendation under EMS constraints.",
    ],
  },
  dataCollection: {
    title: "Future Data Collection",
    bullets: [
      "Immediate: delay codes, power-on time, power-off / crane waits, restriction flag, DRI metallization.",
      "Next: HM temperature, O₂/C profiles, transformer tap, arc V/I.",
      "Later: slag chemistry, foam index, alarm/maintenance historian links.",
    ],
  },
} as const;

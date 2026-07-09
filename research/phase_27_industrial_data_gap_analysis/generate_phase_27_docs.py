"""
Phase 27 — Industrial Data Gap Analysis (documentation only).

Generates Excel, CSV, PDF, and presentation figures for JSPL management.
Does NOT retrain models, engineer features, or modify prior phases.
"""

from __future__ import annotations

from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.backends.backend_pdf import PdfPages
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    ListFlowable,
    ListItem,
)

PHASE_ROOT = Path(__file__).resolve().parent
FIGS = PHASE_ROOT / "presentation_figures"
FIGS.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Evidence anchors from Phases 23–26 (frozen results; not recomputed)
# ---------------------------------------------------------------------------
P25_NORMAL_MAE = 3.28
P26_BEST_MAE = 3.24
P19_LEAKY_MAE = 3.06
P25_DELAY_RECALL = 0.22
P25_PIPELINE_MAE = 16.0
P24_MIXED_MAE = 36.0


# ---------------------------------------------------------------------------
# STEP 1 — Variable inventory
# ---------------------------------------------------------------------------
def build_inventory() -> pd.DataFrame:
    rows = [
        # Available raw
        ("Heat Number", "Operational", "Available", "Identifier", "MES", "ID only", "No"),
        ("Date", "Operational", "Available", "Temporal context", "MES", "Time stamp", "No"),
        ("Shift", "Operational", "Available", "Crew/context (weak TTT link)", "MES", "A/B/C", "Yes-weak"),
        ("HM", "Recipe / Planning", "Available", "Hot metal tonnes; sensible heat", "Charge plan", "t", "Yes"),
        ("DRI", "Recipe / Planning", "Available", "DRI tonnes; FeO/gangue load", "Charge plan", "t", "Yes"),
        ("HBI", "Recipe / Planning", "Available", "HBI tonnes (sparse)", "Charge plan", "t", "Yes"),
        ("Bucket", "Recipe / Planning", "Available", "Scrap tonnes", "Charge plan", "t", "Yes"),
        ("LIME", "Recipe / Planning", "Available", "Lime flux", "Charge plan", "t", "Yes"),
        ("DOLO", "Recipe / Planning", "Available", "Dolomite flux", "Charge plan", "t", "Yes"),
        ("CPC", "Recipe / Process?", "Available-timing uncertain", "Carbon; foam path if planning", "MES/SCADA?", "kg", "Yes-if setpoint"),
        ("OXY", "Recipe / Process?", "Available-timing uncertain", "Oxygen; refining if planning", "MES/SCADA?", "Nm3", "Yes-if setpoint"),
        ("T C", "Recipe / Planning", "Available / derived", "Total metallic charge", "Computed", "t", "Constraint"),
        ("POWER", "Outcome (misnamed)", "Available-LEAKAGE", "End-of-heat EE_KWH — not planning input", "SCADA totalizer", "kWh", "NO — leakage"),
        ("TTT", "Outcome", "Available", "Tap-to-tap time (target)", "MES", "min", "Prediction target"),
        # Missing critical
        ("Power-on time", "Process", "Missing", "Arcing / melting duration", "SCADA", "min", "Yes-indirect"),
        ("Power-off time", "Process / Operational", "Missing", "Idle + logistics + waits", "SCADA/MES", "min", "Ops minimize"),
        ("Delay codes", "Operational", "Missing", "Root cause of abnormal TTT", "MES historian", "code", "Ops"),
        ("Charging delay", "Operational", "Missing", "Bucket/crane wait before arc", "MES timestamps", "min", "Ops"),
        ("Crane waiting", "Operational", "Missing", "Material handling delay", "MES", "min", "Ops"),
        ("Ladle waiting", "Operational", "Missing", "Downstream wait extends heat", "MES", "min", "Ops"),
        ("Power restriction flag", "Operational / Constraint", "Missing", "Transformer/EMS limit", "EMS/MES", "flag", "Constraint"),
        ("Power interruption events", "Operational", "Missing", "Trips / dips", "SCADA alarms", "events", "Ops"),
        ("DRI metallization %", "Quality", "Missing", "94–96% optimum literature", "DRI plant lab", "%", "Upstream"),
        ("DRI gangue / SiO2", "Quality", "Missing", "Slag volume & energy", "Lab", "%", "Upstream"),
        ("HM temperature", "Process / Quality", "Missing", "Sensible heat at charge", "Pyrometer", "°C", "Semi"),
        ("Tap temperature", "Quality / Outcome", "Missing", "End-point control", "TC probe", "°C", "Semi"),
        ("Transformer tap", "Process", "Missing", "Power level setpoint", "SCADA", "tap", "Yes"),
        ("Arc voltage / current", "Process", "Missing", "Arc efficiency / foam proxy", "SCADA", "V/A", "Yes"),
        ("Electrode breakage", "Operational", "Missing", "Sudden delay driver", "Operator/PLC", "event", "Ops"),
        ("Electrode regulation", "Process", "Missing", "Arc length control", "SCADA", "setpoint", "Yes"),
        ("O2 flow profile", "Process", "Missing", "Time-resolved blowing", "SCADA", "Nm3/min", "Yes"),
        ("C injection profile", "Process", "Missing", "Foam timing", "SCADA", "kg/min", "Yes"),
        ("Slag chemistry (CaO/SiO2/FeO)", "Quality / Process", "Missing", "Basicity / foam condition", "Lab/spectrometer", "%", "Indirect"),
        ("Foam index", "Process", "Missing", "Arc coverage state", "Derived/camera?", "index", "Indirect"),
        ("Bucket sequence / timestamps", "Operational", "Partial (tonnage only)", "Charging pattern & pace", "MES", "seq+time", "Yes"),
        ("Operator interventions", "Operational", "Missing", "Manual overrides", "MES log", "events", "Ops"),
        ("Alarm / maintenance logs", "Operational", "Missing", "Equipment induced delays", "Historian", "events", "Ops"),
        ("Electrode consumption", "Outcome", "Missing", "Related to foam & practice", "Stores/MES", "kg/heat", "Indirect"),
    ]
    df = pd.DataFrame(
        rows,
        columns=[
            "Variable",
            "Category",
            "Status",
            "Role_in_TTT",
            "Likely_source",
            "Unit_or_type",
            "Controllable_at_planning",
        ],
    )
    return df


def write_inventory_xlsx(inv: pd.DataFrame):
    derived = pd.DataFrame(
        [
            ("Phase 16–18 ratios / interactions", "Derived", "Available", "Leakage-free subset kept in Phase 24–26"),
            ("Phase 24 planning features (56)", "Derived", "Available", "No EE_KWH; OXY/CPC assumed planning"),
            ("Phase 26 gold features (7)", "Derived", "Available", "LOG_OXYGEN, SCRAP_CARBON_OXYGEN, etc."),
            ("Industrial_Class / Regime labels", "Derived from TTT", "Available", "NORMAL/LONG/DELAY/SHUTDOWN — post-hoc"),
        ],
        columns=["Variable", "Category", "Status", "Notes"],
    )
    summary = pd.DataFrame(
        [
            ("Available planning/recipe", int((inv["Status"] == "Available").sum())),
            ("Available with leakage risk", int(inv["Status"].str.contains("LEAKAGE").sum())),
            ("Timing uncertain", int(inv["Status"].str.contains("uncertain").sum())),
            ("Missing", int((inv["Status"] == "Missing").sum())),
            ("Partial", int(inv["Status"].str.contains("Partial").sum())),
            ("Information ceiling evidence", "Phase 26 ΔMAE ≈ −0.04 min only"),
        ],
        columns=["Item", "Value"],
    )
    with pd.ExcelWriter(PHASE_ROOT / "complete_variable_inventory.xlsx", engine="openpyxl") as xw:
        inv.to_excel(xw, sheet_name="Full_inventory", index=False)
        derived.to_excel(xw, sheet_name="Derived_features", index=False)
        inv[inv["Status"].str.contains("Missing|Partial", regex=True)].to_excel(
            xw, sheet_name="Gaps", index=False
        )
        summary.to_excel(xw, sheet_name="Summary", index=False)


# ---------------------------------------------------------------------------
# STEP 3–5 — Literature matrix, missing measurements, MES/SCADA, info gain
# ---------------------------------------------------------------------------
def build_literature_matrix() -> pd.DataFrame:
    rows = [
        ("Power-on / arcing time", "TTT, SEC, melting efficiency", "Very High", "Not available", "Medium", 1.2, 1.8, "Knutsen 2020; Sjunnesson 2019; CJCE 2025"),
        ("Power-off / delay minutes", "TTT, delays, energy waste", "Very High", "Not available", "Medium", 1.5, 2.5, "Štore Steel 2019; Knutsen 2020"),
        ("Delay reason codes", "Delay prediction, regime separation", "Very High", "Not available", "Low–Medium", 0.8, 2.0, "Štore Steel 2019; plant MES practice"),
        ("DRI metallization", "TTT, SEC, arc stability", "High", "Not available", "Medium", 0.3, 0.8, "Kirschen 2011; Memoli 2021; Midrex"),
        ("DRI gangue / SiO2", "Slag volume, SEC", "High", "Not available", "Medium", 0.2, 0.6, "Kirschen 2011; Memoli 2021"),
        ("HM temperature", "TTT, melting", "Medium–High", "Not available", "Low–Medium", 0.2, 0.5, "Duan 2014; Yang 2023"),
        ("Foamy slag / foam index", "Power, electrode life, melt rate", "High", "Not available", "High", 0.3, 0.7, "Morales 2025; Kirschen 2011; Gaskell foam"),
        ("O2 / C injection profiles", "Refining time, foam, FeO", "High", "Totals only uncertain", "Medium", 0.3, 0.6, "Duan 2014; Morales 2025"),
        ("Transformer tap / MW setpoint", "Power, TTT", "Medium–High", "Not available", "Low", 0.2, 0.4, "Pfeifer 2011; Primetals Melt Expert"),
        ("Arc V/I", "Foam proxy, energy efficiency", "Medium–High", "Not available", "Medium", 0.2, 0.5, "Aminorroaya THD; Węglarz 2024"),
        ("Electrode breakage / consumption", "Delays, cost, practice quality", "Medium", "Not available", "Medium", 0.2, 0.5, "Pfeifer 2011"),
        ("Bucket charging timestamps", "Charging delays, TTT", "High", "Partial tonnage only", "Low–Medium", 0.4, 1.0, "Knutsen 2020; Memoli 2021"),
        ("Power restriction / EMS events", "TTT extension", "High", "Not available", "Low", 0.3, 0.7, "JSPL practice; Kirschen 2011"),
        ("Slag chemistry (CaO, SiO2, FeO, MgO)", "Foam, refining, energy", "High", "Not available", "High", 0.3, 0.8, "Memoli 2021; AusIMM slag"),
        ("End-of-heat kWh (already present)", "SEC outcome — leakage if used as input", "High (as outcome)", "Available as POWER", "N/A", 0.0, 0.0, "Knutsen 2020 — use as target not input"),
        ("Charge recipe (HM/DRI/scrap/flux)", "TTT planning", "High", "Available", "N/A", 0.0, 0.0, "Duan; Memoli — current ceiling ~3.2–3.3 min MAE"),
    ]
    return pd.DataFrame(
        rows,
        columns=[
            "Variable",
            "Influences",
            "Importance",
            "JSPL_availability",
            "Install_difficulty",
            "Expected_MAE_gain_low_min",
            "Expected_MAE_gain_high_min",
            "Literature",
        ],
    )


def build_mes_scada() -> pd.DataFrame:
    rows = [
        ("Power-on time", "Core component of TTT; separates melt from logistics", "Strong negative correlation with residual TTT error if missing", "1 / heat (or 1 Hz for live)", "SCADA electrical metering", "Medium", 1.5, "P0"),
        ("Power-off time", "Captures idle radiation losses and waits", "Positive on TTT; enables delay vs melt diagnostics", "1 / heat", "SCADA + MES event timer", "Medium", 1.2, "P0"),
        ("Delay codes", "Explains 5% abnormal heats that dominate plant MAE", "Enables Stage-1 classifier reliability (Phase 25 recall was 22%)", "Event-based", "MES historian", "Low–Medium", 2.0, "P0"),
        ("Charging / crane wait timestamps", "Charging is power-off dominated sub-phase", "Reduces unexplained LONG regime variance", "Event timestamps", "MES logistics", "Low–Medium", 1.0, "P0"),
        ("Power restriction flag", "Hard constraint; extends arcing under load limits", "Prevents impossible recipes; improves delay prediction", "Event / continuous flag", "EMS / MES", "Low", 0.6, "P0"),
        ("DRI metallization %", "Quality drives FeO & melt behavior (literature 94–96%)", "Negative on TTT when higher (conditional)", "Per lot / heat", "DRI plant laboratory", "Medium", 0.8, "P1"),
        ("HM temperature at charge", "Sensible heat input", "Higher HM temp → lower melting time", "Per heat", "Pyrometer / ladle TC", "Medium", 0.4, "P1"),
        ("Bucket sequence + times", "Charge pattern & pace", "High scrap / multi-bucket extend TTT", "Event stream", "MES", "Medium", 0.5, "P1"),
        ("O2 flow profile", "Refining trajectory & FeO control", "Time-resolved vs total OXY only", "1–10 s", "SCADA gas system", "Medium–High", 0.5, "P1"),
        ("Carbon injection profile", "Foam formation timing", "Coupled with O2 and scrap", "1–10 s", "SCADA injection", "Medium–High", 0.4, "P1"),
        ("Transformer tap / MW", "Electrical power setpoint", "Constraint for optimizer & twin", "1 s / on change", "SCADA transformer", "Low–Medium", 0.3, "P2"),
        ("Arc voltage & current", "Arc coverage / foam proxy", "Supports foam inference without camera", "1–10 Hz", "SCADA electrodes", "Medium", 0.4, "P2"),
        ("Electrode breakage event", "Sudden LONG/SHUTDOWN driver", "Binary delay predictor", "Event", "PLC + operator log", "Low", 0.4, "P2"),
        ("Tap temperature", "End-point quality; extended refining driver", "High tap temp target can extend refining", "Per heat", "TC probe", "Low", 0.3, "P2"),
        ("Slag chemistry", "Basicity, FeO, foam condition", "Physics features for energy & foam", "Per heat (lab lag)", "Laboratory / XRFS", "High", 0.6, "P2"),
        ("Foam index / camera", "Direct foam state", "Strong arc efficiency signal", "1 Hz or event", "Camera / derived", "High", 0.5, "P3"),
        ("Operator interventions", "Human overrides explain residuals", "Context for root-cause analytics", "Event", "MES HMI log", "Medium", 0.3, "P3"),
        ("Alarm & maintenance logs", "Equipment-induced delays", "Predictive maintenance link", "Event", "Historian", "Medium", 0.4, "P3"),
        ("Ladle waiting time", "Downstream bottleneck", "Power-off extension", "Event", "MES secondary metallurgy", "Medium", 0.5, "P2"),
        ("Electrode consumption", "Cost + foam/practice KPI", "Indirect TTT / practice quality", "Per heat / campaign", "Stores + MES", "Medium", 0.2, "P3"),
    ]
    return pd.DataFrame(
        rows,
        columns=[
            "Variable",
            "Why_it_matters",
            "Expected_influence",
            "Sampling_frequency",
            "Likely_source",
            "Implementation_effort",
            "Expected_MAE_improvement_min",
            "Priority",
        ],
    )


def build_info_gain(mes: pd.DataFrame) -> pd.DataFrame:
    # Conservative, non-additive realism note in report
    g = mes[["Variable", "Priority", "Expected_MAE_improvement_min", "Implementation_effort", "Likely_source"]].copy()
    g = g.sort_values(["Priority", "Expected_MAE_improvement_min"], ascending=[True, False])
    g["Cumulative_optimistic_min"] = g["Expected_MAE_improvement_min"].cumsum()
    g["Realistic_note"] = (
        "Gains overlap; use 40–60% of sum for portfolio planning. "
        "Delay codes mainly improve abnormal/path MAE & warning recall, not only normal MAE."
    )
    # Scenario rows
    scenarios = pd.DataFrame(
        [
            {
                "Variable": "SCENARIO_A_P0_bundle",
                "Priority": "P0",
                "Expected_MAE_improvement_min": 1.8,
                "Implementation_effort": "6–12 months",
                "Likely_source": "MES+SCADA",
                "Cumulative_optimistic_min": 1.8,
                "Realistic_note": "Normal-heat MAE ~3.3→~2.3–2.7; delay recall ≫22%",
            },
            {
                "Variable": "SCENARIO_B_P0_plus_P1",
                "Priority": "P0+P1",
                "Expected_MAE_improvement_min": 2.4,
                "Implementation_effort": "12–24 months",
                "Likely_source": "MES+SCADA+lab",
                "Cumulative_optimistic_min": 2.4,
                "Realistic_note": "Sub-2.5 MAE plausible on normal heats with clean labels",
            },
            {
                "Variable": "SCENARIO_C_digital_twin_v3",
                "Priority": "P0–P2",
                "Expected_MAE_improvement_min": 2.8,
                "Implementation_effort": "24–36 months",
                "Likely_source": "Historian+live tags",
                "Cumulative_optimistic_min": 2.8,
                "Realistic_note": "Dynamic TTT + delay early warning; twin residual depends on sensor quality",
            },
        ]
    )
    return pd.concat([g, scenarios], ignore_index=True)


# ---------------------------------------------------------------------------
# Figures
# ---------------------------------------------------------------------------
def fig_process_gaps():
    stages = [
        ("Scrap\ncharging", False),
        ("HM\ncharging", True),
        ("DRI\nfeeding", True),
        ("Melting", False),
        ("Foamy\nslag", False),
        ("Refining", "partial"),
        ("Tapping", False),
    ]
    fig, ax = plt.subplots(figsize=(12, 3.2))
    ax.set_xlim(0, len(stages))
    ax.set_ylim(0, 1.2)
    ax.axis("off")
    for i, (name, status) in enumerate(stages):
        if status is True:
            c = "#2ca02c"
            tag = "DATA"
        elif status == "partial":
            c = "#ff7f0e"
            tag = "PARTIAL"
        else:
            c = "#d62728"
            tag = "GAP"
        ax.add_patch(mpatches.FancyBboxPatch((i + 0.1, 0.35), 0.8, 0.45, boxstyle="round,pad=0.03", fc=c, ec="black", alpha=0.85))
        ax.text(i + 0.5, 0.58, name, ha="center", va="center", fontsize=9, color="white", fontweight="bold")
        ax.text(i + 0.5, 0.2, tag, ha="center", fontsize=8)
        if i < len(stages) - 1:
            ax.annotate("", xy=(i + 1.05, 0.58), xytext=(i + 0.95, 0.58), arrowprops=dict(arrowstyle="->", lw=1.5))
    ax.set_title("EAF process stages vs current JSPL recorded data", fontsize=12, pad=8)
    fig.tight_layout()
    fig.savefig(FIGS / "process_data_coverage.png", dpi=220)
    plt.close(fig)


def fig_info_gain_bars(mes: pd.DataFrame):
    top = mes.sort_values("Expected_MAE_improvement_min", ascending=True).tail(12)
    fig, ax = plt.subplots(figsize=(9, 5.5))
    ax.barh(top["Variable"], top["Expected_MAE_improvement_min"], color="#1f77b4")
    ax.set_xlabel("Expected MAE improvement (minutes, literature-based estimate)")
    ax.set_title("Priority measurements — estimated information gain")
    fig.tight_layout()
    fig.savefig(FIGS / "expected_information_gain.png", dpi=220)
    plt.close(fig)


def fig_mae_ceiling():
    labels = ["P19 leaky\n(random)", "P25 LF normal\n(random)", "P26 gold+\nLF", "P0 sensors\n(est.)", "P0+P1\n(est.)"]
    vals = [3.06, 3.28, 3.24, 2.5, 2.2]
    colors_list = ["#7f7f7f", "#1f77b4", "#1f77b4", "#2ca02c", "#2ca02c"]
    fig, ax = plt.subplots(figsize=(9, 4.2))
    ax.bar(labels, vals, color=colors_list)
    ax.axhline(2.5, color="red", ls="--", label="2.5 min target")
    ax.set_ylabel("MAE (min)")
    ax.set_title("Information ceiling: algorithms vs new measurements")
    ax.legend()
    fig.tight_layout()
    fig.savefig(FIGS / "mae_ceiling_roadmap.png", dpi=220)
    plt.close(fig)


def fig_digital_twin_layers():
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.axis("off")
    layers = [
        (0.05, 0.78, 0.9, 0.16, "V4 Closed-loop optimization\nRecipe recommender · constraints · operator confirm", "#4c78a8"),
        (0.05, 0.58, 0.9, 0.16, "V3 Real-time digital twin\nLive SCADA tags · dynamic TTT · delay early warning", "#72b7b2"),
        (0.05, 0.38, 0.9, 0.16, "V2 Planning + SCADA features\nPower-on/off · delay codes · metallization · restriction flag", "#f58518"),
        (0.05, 0.18, 0.9, 0.16, "V1 Current (frozen)\nPhase 19 production · Phase 25/26 experimental LF + two-stage", "#e45756"),
    ]
    for x, y, w, h, text, c in layers:
        ax.add_patch(mpatches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02", fc=c, ec="black", alpha=0.9))
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", color="white", fontsize=10, fontweight="bold")
    ax.text(0.5, 0.08, "Data foundations: PLC → SCADA → Historian → MES → AI services → Operator dashboard", ha="center", fontsize=9)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title("JSPL EAF Digital Twin maturity ladder")
    fig.tight_layout()
    fig.savefig(FIGS / "digital_twin_layers.png", dpi=220)
    plt.close(fig)


def fig_roadmap_timeline():
    fig, ax = plt.subplots(figsize=(11, 4.5))
    ax.set_ylim(0, 4)
    ax.set_xlim(0, 36)
    items = [
        (0, 6, 3, "Shadow two-stage\n+ gold features", "#1f77b4"),
        (3, 12, 2.2, "P0 MES/SCADA\ndelay + power-on", "#ff7f0e"),
        (9, 18, 1.4, "P1 metallization\n+ profiles", "#2ca02c"),
        (18, 30, 0.6, "V3 live twin\n+ warning KPI", "#9467bd"),
        (24, 36, 0.2, "V4 closed-loop\noptimizer", "#d62728"),
    ]
    for x0, x1, y, label, c in items:
        ax.barh(y, x1 - x0, left=x0, height=0.55, color=c, alpha=0.85)
        ax.text((x0 + x1) / 2, y, label, ha="center", va="center", fontsize=8, color="white", fontweight="bold")
    ax.set_xlabel("Months from now")
    ax.set_yticks([])
    ax.set_title("12-month vs 36-month industrial AI roadmap")
    ax.axvline(12, color="k", ls="--", lw=1)
    ax.text(12, 3.7, "12 mo", ha="center")
    ax.axvline(36, color="k", ls=":", lw=1)
    fig.tight_layout()
    fig.savefig(FIGS / "industrial_ai_roadmap_timeline.png", dpi=220)
    plt.close(fig)


# ---------------------------------------------------------------------------
# PDFs
# ---------------------------------------------------------------------------
def styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(name="TitleJ", parent=ss["Title"], fontSize=18, spaceAfter=12))
    ss.add(ParagraphStyle(name="H1J", parent=ss["Heading1"], fontSize=14, spaceBefore=10, spaceAfter=6))
    ss.add(ParagraphStyle(name="H2J", parent=ss["Heading2"], fontSize=12, spaceBefore=8, spaceAfter=4))
    ss.add(ParagraphStyle(name="BodyJ", parent=ss["BodyText"], fontSize=10, leading=13, alignment=TA_JUSTIFY))
    ss.add(ParagraphStyle(name="CenterJ", parent=ss["BodyText"], fontSize=10, alignment=TA_CENTER))
    return ss


def pdf_process_map():
    path = PHASE_ROOT / "industrial_process_map.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=landscape(A4), leftMargin=1.5 * cm, rightMargin=1.5 * cm, topMargin=1.5 * cm, bottomMargin=1.5 * cm)
    ss = styles()
    story = []
    story.append(Paragraph("JSPL EAF Industrial Process Map vs Data Coverage", ss["TitleJ"]))
    story.append(Paragraph(
        "Phase 27 data-gap analysis. Based on Phase 23 literature (Knutsen, Sjunnesson, Kirschen, Memoli, Duan) "
        "and Phase 24–26 empirical findings. Production models frozen.",
        ss["CenterJ"],
    ))
    story.append(Spacer(1, 8))

    data = [
        ["Process stage", "Primary TTT drivers", "Currently recorded?", "Data gap impact"],
        ["Scrap charging", "Bucket logistics, crane wait, sequence", "Scrap tonnes only", "HIGH — delays invisible"],
        ["HM charging", "HM mass, temperature, arrival wait", "HM tonnes; no temperature/time", "MEDIUM–HIGH"],
        ["DRI feeding", "Rate, metallization, temperature", "DRI tonnes only", "HIGH — quality missing"],
        ["Melting", "Power-on, arc, foam, solid burden", "No power-on; no arc V/I", "VERY HIGH"],
        ["Foamy slag", "C/O2 timing, FeO, foam index", "Proxy only (totals uncertain)", "HIGH"],
        ["Refining", "O2 profile, temp endpoint, chemistry", "OXY total; no profile/slag lab", "HIGH"],
        ["Tapping / turnaround", "EBT, ladle wait, maintenance", "TTT end only", "HIGH for delays"],
        ["Abnormal events", "Delay codes, trips, electrode break", "Inferred from TTT only", "CRITICAL"],
    ]
    t = Table(data, colWidths=[4.2 * cm, 7 * cm, 6 * cm, 5.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4e79")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.Color(0.93, 0.95, 0.98)]),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 12))
    story.append(Paragraph("Key conclusion", ss["H2J"]))
    story.append(Paragraph(
        "JSPL currently records <b>recipe inputs</b> and a <b>single outcome (TTT)</b>, plus an end-of-heat "
        "energy total (POWER = EE_KWH) that must not be used as a planning feature. Almost all <b>process-state "
        "and delay-event</b> measurements are absent. This explains the Phase 26 information ceiling "
        f"(~{P26_BEST_MAE:.2f} min MAE) and Phase 25 delay-warning recall of only ~{int(P25_DELAY_RECALL*100)}%.",
        ss["BodyJ"],
    ))
    story.append(Spacer(1, 8))
    # embed figure path note
    story.append(Paragraph(
        "See also presentation_figures/process_data_coverage.png for the stage colour map "
        "(green = data, orange = partial, red = gap).",
        ss["BodyJ"],
    ))
    doc.build(story)


def pdf_digital_twin():
    path = PHASE_ROOT / "digital_twin_architecture.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    ss = styles()
    story = []
    story.append(Paragraph("JSPL EAF Digital Twin Architecture Roadmap", ss["TitleJ"]))
    story.append(Paragraph("Phase 27 recommendation document — experimental research track. Production remains frozen.", ss["CenterJ"]))
    story.append(Spacer(1, 6))

    story.append(Paragraph("1. Version ladder", ss["H1J"]))
    for title, body in [
        ("V1 — Current planning model", "Frozen Phase 19 StackingRegressor (leaky EE-derived features) serves production. Experimental Phase 25 two-stage + Phase 26 gold leakage-free features ready for shadow mode only."),
        ("V2 — Planning + SCADA/MES features", "Ingest P0 tags: power-on/off, delay codes, charging timestamps, restriction flag; P1: metallization, HM temp. Retrain leakage-free Stage 2; improve Stage 1 delay classifier."),
        ("V3 — Real-time digital twin", "Historian streams feed live TTT residual prediction, foam proxies from V/I, and delay early-warning. Operator dashboard shows confidence and SHAP drivers."),
        ("V4 — Closed-loop recipe recommendation", "Optimizer (Phase 20 lineage) constrained by twin forecasts, EMS limits, and metallurgical rules — human confirm in the loop."),
    ]:
        story.append(Paragraph(title, ss["H2J"]))
        story.append(Paragraph(body, ss["BodyJ"]))

    story.append(Paragraph("2. Data flow", ss["H1J"]))
    story.append(Paragraph(
        "<b>PLC / Instrumentation</b> → <b>SCADA</b> (electrical, gas, electrodes) → <b>Historian</b> → "
        "<b>MES</b> (heats, delays, charge plans, quality) → <b>Feature store</b> → "
        "<b>AI modules</b> (regime classifier, TTT regression, delay warner) → "
        "<b>Operator dashboard</b> &amp; <b>Optimization engine</b> → confirmed setpoints back to MES/SCADA.",
        ss["BodyJ"],
    ))

    story.append(Paragraph("3. AI modules", ss["H1J"]))
    data = [
        ["Module", "Role", "Depends on"],
        ["Regime classifier", "NORMAL vs ABNORMAL", "Delay codes, power-off, restriction"],
        ["Normal TTT regressor", "Planning estimate", "Recipe + power-on drivers + quality"],
        ["Delay warner", "Early alert", "Event streams + logistics delays"],
        ["Energy / foam advisor", "Process coaching", "V/I, C/O2 profiles"],
        ["Optimizer", "Recipe search", "Twin constraints, not EE_KWH free var"],
    ]
    t = Table(data, colWidths=[4 * cm, 5.5 * cm, 6.5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2e5984")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "See presentation_figures/digital_twin_layers.png for the maturity diagram.",
        ss["BodyJ"],
    ))
    doc.build(story)


def pdf_ai_roadmap():
    path = PHASE_ROOT / "industrial_ai_roadmap.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=1.8 * cm, rightMargin=1.8 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm)
    ss = styles()
    story = []
    story.append(Paragraph("Industrial AI & Research Roadmap for JSPL EAF", ss["TitleJ"]))
    story.append(Paragraph("Prepared as Phase 27 deliverable for management and academic planning.", ss["CenterJ"]))
    story.append(Spacer(1, 8))

    story.append(Paragraph("A. Next 12 months (plant)", ss["H1J"]))
    story.append(ListFlowable([
        ListItem(Paragraph("Instrument P0: delay codes, power-on/off, charging/crane waits, restriction flag.", ss["BodyJ"])),
        ListItem(Paragraph("Shadow-deploy Phase 25 two-stage + Phase 26 gold features; do not replace Phase 19 yet.", ss["BodyJ"])),
        ListItem(Paragraph("Confirm OXY/CPC are planning setpoints vs final totals (Phase 23.5 open question).", ss["BodyJ"])),
        ListItem(Paragraph("Define KPI dashboard: normal MAE, delay recall, false-alarm rate.", ss["BodyJ"])),
    ], bulletType="1"))

    story.append(Paragraph("B. Next 3 years (digital twin)", ss["H1J"]))
    story.append(ListFlowable([
        ListItem(Paragraph("Year 1–2: P1 quality (metallization, HM temp) and gas injection profiles; Stage-1 recall &gt;80%.", ss["BodyJ"])),
        ListItem(Paragraph("Year 2–3: V3 twin with live residual monitoring; electrode/alarm analytics.", ss["BodyJ"])),
        ListItem(Paragraph("Year 3: V4 closed-loop optimizer with human confirmation; EE_KWH used only as outcome KPI.", ss["BodyJ"])),
    ], bulletType="1"))

    story.append(Paragraph("C. Recommended MSc / PhD topics", ss["H1J"]))
    topics = [
        ["Topic", "Degree fit", "Data need"],
        ["Dynamic TTT prediction with streaming SCADA", "MSc / PhD", "Power-on, V/I"],
        ["Causal delay prediction from MES event logs", "MSc", "Delay codes"],
        ["Physics-informed slag foam & energy models", "PhD", "Slag + C/O2 profiles"],
        ["Two-stage / hierarchical regime models for EAF", "MSc", "Current + events"],
        ["Safe RL for recipe adaptation under constraints", "PhD", "Twin sandbox"],
        ["Predictive maintenance from electrode & alarms", "MSc", "Historian"],
        ["Digital twin validation vs plant KPI", "PhD", "Full stack"],
        ["DRI quality → melt time transfer learning", "MSc", "Metallization"],
    ]
    t = Table(topics, colWidths=[8 * cm, 3 * cm, 5 * cm])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1f4e79")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.whitesmoke, colors.Color(0.93, 0.95, 0.98)]),
            ]
        )
    )
    story.append(t)
    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Evidence basis: Phase 19 MAE≈{P19_LEAKY_MAE}; Phase 25 LF normal≈{P25_NORMAL_MAE}; "
        f"Phase 26 best≈{P26_BEST_MAE}; mixed-cohort single model≈{P24_MIXED_MAE}; "
        f"two-stage plant MAE≈{P25_PIPELINE_MAE}; delay recall≈{int(P25_DELAY_RECALL*100)}%.",
        ss["BodyJ"],
    ))
    doc.build(story)


def write_phase28(mes: pd.DataFrame, lit: pd.DataFrame):
    top5 = mes.sort_values("Expected_MAE_improvement_min", ascending=False).head(5)
    md = f"""# Phase 28 Recommendations
## JSPL Management Brief — Industrial Data Gap Analysis (Phase 27)

**Status:** Production Phases 19–22 and research Phases 25–26 remain **frozen**.  
**Finding:** Algorithmic remixing of existing columns has hit an **information ceiling** (Phase 26 ΔMAE ≈ **−0.04 min** only).

---

## Executive answers

### 1. What is the single biggest missing variable?
**Delay codes / event logs** (coupled with power-off time).  
Evidence: ~5% abnormal heats drive plant-level MAE from ~3 min to ~16–36 min; Stage-1 abnormal recall today is only **~22%** because charge recipes cannot see logistics/equipment events (Phase 25).

### 2. Which five variables should JSPL start recording immediately?
| # | Variable | Est. MAE gain | Effort |
|---|----------|---------------|--------|
| 1 | Delay codes + timestamps | ~2.0 min (esp. plant/abnormal path) | Low–Medium |
| 2 | Power-on time | ~1.5 min | Medium |
| 3 | Power-off / charging–crane waits | ~1.0–1.2 min | Low–Medium |
| 4 | Power restriction flag | ~0.6 min | Low |
| 5 | DRI metallization % | ~0.8 min | Medium |

### 3. How much MAE reduction is realistically possible?
| Scope | Today | After P0 (realistic) | After P0+P1 |
|-------|-------|----------------------|-------------|
| Normal heats (LF) | ~3.24–3.28 min | **~2.3–2.7 min** | **~2.0–2.4 min** |
| Full plant (two-stage) | ~16 min | Large drop via delay detection | Further with live twin |

Gains are **not fully additive**; plan portfolios at ~40–60% of summed literature estimates.

### 4. Can MAE below 2.5 minutes be achieved?
**Yes, on normal heats**, if P0 (+ preferably P1 metallization / HM temperature) are instrumented and two-stage architecture is retained.  
**Unlikely** with the current dataset alone (Phase 26 ceiling).  
**Sub-2.0 min** is aspirational and needs high-quality live SCADA + quality labs (V3).

### 5. Roadmap: today's model → plant-wide digital twin
```
V1 Current (frozen Phase 19 + experimental 25/26)
 → V2 Planning + SCADA/MES P0–P1 tags
 → V3 Real-time twin (live residual + delay warning)
 → V4 Closed-loop recipe recommendation (human confirm)
```
Data path: PLC → SCADA → Historian → MES → Feature store → AI services → Dashboard / Optimizer.

### 6. Next 12 months
1. Implement **P0 measurement package** (delays, power-on/off, waits, restriction).
2. **Shadow-deploy** Phase 25 two-stage + Phase 26 gold features; keep Phase 19 production.
3. Resolve **OXY/CPC timing** semantics with operations.
4. Publish monthly KPIs: normal MAE, delay recall, false alarms.
5. Start DRI lab metallization data pipeline design (P1).

### 7. Next 3 years
1. Year 1–2: P1 quality & injection profiles; Stage-1 recall **>80%**.
2. Year 2–3: V3 digital twin + operator cockpit.
3. Year 3: V4 constrained optimizer; EE_KWH only as **outcome KPI**, never free decision variable.
4. Academic programme: dynamic TTT, causal delay models, physics-informed foam/energy, safe RL sandbox.

---

## Priority table (top estimates)

{top5[["Variable", "Expected_MAE_improvement_min", "Implementation_effort", "Priority"]].to_markdown(index=False)}

## What NOT to do
- Do not chase MAE with more derived ratios on the current columns.
- Do not reintroduce EE_KWH features into planning models.
- Do not cut over production until delay warning SLOs are met in shadow mode.
- Do not regress shutdown durations — classify and alert only.

## Phase 28 research focus
**Instrument → validate → twin**, not retrain-only. First engineering milestone: P0 data contracts with MES/SCADA owners and a shadow `/predict/v2` endpoint consuming new tags when available.
"""
    (PHASE_ROOT / "phase_28_recommendations.md").write_text(md, encoding="utf-8")


def main():
    print("STEP 1 inventory...")
    inv = build_inventory()
    write_inventory_xlsx(inv)

    print("STEP 3 literature matrix...")
    lit = build_literature_matrix()
    with pd.ExcelWriter(PHASE_ROOT / "literature_variable_matrix.xlsx", engine="openpyxl") as xw:
        lit.to_excel(xw, sheet_name="Literature_matrix", index=False)
        lit.sort_values("Expected_MAE_gain_high_min", ascending=False).to_excel(
            xw, sheet_name="Ranked_by_gain", index=False
        )

    print("STEP 4 MES/SCADA...")
    mes = build_mes_scada()
    missing = mes.copy()
    missing.insert(0, "Status", "Missing_at_JSPL")
    with pd.ExcelWriter(PHASE_ROOT / "missing_measurements.xlsx", engine="openpyxl") as xw:
        missing.to_excel(xw, sheet_name="Missing_measurements", index=False)
        inv[inv["Status"].str.contains("Missing|Partial|uncertain|LEAKAGE", regex=True)].to_excel(
            xw, sheet_name="Inventory_gaps", index=False
        )
    with pd.ExcelWriter(PHASE_ROOT / "mes_scada_recommendations.xlsx", engine="openpyxl") as xw:
        mes.to_excel(xw, sheet_name="Acquisition_list", index=False)
        mes[mes["Priority"] == "P0"].to_excel(xw, sheet_name="P0_immediate", index=False)
        mes[mes["Priority"] == "P1"].to_excel(xw, sheet_name="P1_year1_2", index=False)
        mes[mes["Priority"].isin(["P2", "P3"])].to_excel(xw, sheet_name="P2_P3_later", index=False)

    print("STEP 5 information gain...")
    gain = build_info_gain(mes)
    gain.to_csv(PHASE_ROOT / "expected_information_gain.csv", index=False)

    print("Figures...")
    fig_process_gaps()
    fig_info_gain_bars(mes)
    fig_mae_ceiling()
    fig_digital_twin_layers()
    fig_roadmap_timeline()

    print("PDFs...")
    pdf_process_map()
    pdf_digital_twin()
    pdf_ai_roadmap()

    print("STEP 7 / Phase 28 brief...")
    write_phase28(mes, lit)

    print("DONE ->", PHASE_ROOT)


if __name__ == "__main__":
    main()

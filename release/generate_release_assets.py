"""
Release 1.0 — generate PDFs, architecture diagrams, and copy thesis/publication figures.
"""

from __future__ import annotations

import shutil
from datetime import datetime, timezone
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Image, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
RELEASE = ROOT / "release"
DOCS = ROOT / "docs"
PHASE33 = ROOT / "research" / "phase_33_industrial_product_validation"
FIGURES = RELEASE / "figures"
ARCH = FIGURES / "architecture"
THESIS = FIGURES / "thesis"
PUB = FIGURES / "publication"


def _styles():
    styles = getSampleStyleSheet()
    if "H1Release" not in styles:
        styles.add(ParagraphStyle(name="H1Release", parent=styles["Heading1"], fontSize=18, spaceAfter=12))
    if "H2Release" not in styles:
        styles.add(ParagraphStyle(name="H2Release", parent=styles["Heading2"], fontSize=14, spaceAfter=8))
    if "BodyRelease" not in styles:
        styles.add(ParagraphStyle(name="BodyRelease", parent=styles["Normal"], fontSize=10, leading=14))
    if "MonoRelease" not in styles:
        styles.add(ParagraphStyle(name="MonoRelease", parent=styles["Code"], fontSize=8, leading=10))
    return styles


def md_to_pdf(md_path: Path, pdf_path: Path, title: str) -> None:
    text = md_path.read_text(encoding="utf-8") if md_path.exists() else ""
    styles = _styles()
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)
    story = [
        Paragraph(title, styles["H1Release"]),
        Paragraph(f"JSPL EAF Industrial AI Decision Support — Release 1.0<br/>Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d')}", styles["BodyRelease"]),
        Spacer(1, 0.5 * cm),
    ]
    for line in text.splitlines():
        line = line.strip()
        if not line:
            story.append(Spacer(1, 0.2 * cm))
            continue
        safe = line.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        if line.startswith("# "):
            story.append(Paragraph(safe[2:], styles["H1Release"]))
        elif line.startswith("## "):
            story.append(Paragraph(safe[3:], styles["H2Release"]))
        elif line.startswith("|") and "---" not in line:
            story.append(Paragraph(safe, styles["MonoRelease"]))
        elif line.startswith("- ") or line.startswith("* "):
            story.append(Paragraph(f"• {safe[2:]}", styles["BodyRelease"]))
        else:
            story.append(Paragraph(safe, styles["BodyRelease"]))
    doc.build(story)


def generate_architecture_diagram() -> Path:
    import matplotlib.pyplot as plt
    import matplotlib.patches as mpatches

    ARCH.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis("off")
    ax.set_title("JSPL EAF Industrial AI — System Architecture (Release 1.0)", fontsize=14, fontweight="bold")

    boxes = [
        (1, 7.5, 3, 1.2, "Next.js Frontend\n(frontend_v2)", "#4A90D9"),
        (5, 7.5, 3, 1.2, "FastAPI Backend\n(port 8001)", "#50C878"),
        (9, 7.5, 2.5, 1.2, "Validation Store\n(JSON)", "#F4A460"),
        (2, 5.5, 2.5, 1.2, "Phase 19\nPrediction", "#9B59B6"),
        (5, 5.5, 2.5, 1.2, "Phase 20.2\nOptimizer", "#9B59B6"),
        (8, 5.5, 2.5, 1.2, "Phase 31 V2\n(Research)", "#E67E22"),
        (2, 3.5, 2.5, 1.2, "Phase 32\nHybrid Engine", "#E67E22"),
        (5, 3.5, 2.5, 1.2, "Phase 29\nExplainability", "#1ABC9C"),
        (8, 3.5, 2.5, 1.2, "Phase 21\nFeatures", "#95A5A6"),
        (3.5, 1.5, 5, 1.2, "Frozen Research Artifacts (Phases 16–33)", "#34495E"),
    ]
    for x, y, w, h, label, color in boxes:
        rect = mpatches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.05", facecolor=color, edgecolor="white", alpha=0.85)
        ax.add_patch(rect)
        ax.text(x + w / 2, y + h / 2, label, ha="center", va="center", fontsize=8, color="white", fontweight="bold")

    # arrows
    ax.annotate("", xy=(6.5, 7.5), xytext=(2.5, 6.7), arrowprops=dict(arrowstyle="->", color="#333"))
    ax.annotate("", xy=(6.5, 7.5), xytext=(6.25, 6.7), arrowprops=dict(arrowstyle="->", color="#333"))
    ax.annotate("", xy=(6.5, 7.5), xytext=(9.25, 6.7), arrowprops=dict(arrowstyle="->", color="#333"))
    ax.annotate("", xy=(6.25, 5.5), xytext=(6.25, 4.7), arrowprops=dict(arrowstyle="->", color="#333"))
    ax.annotate("", xy=(3.25, 5.5), xytext=(6, 2.7), arrowprops=dict(arrowstyle="->", color="#666", linestyle="dashed"))

    out_png = ARCH / "system_architecture.png"
    out_svg = ARCH / "system_architecture.svg"
    fig.savefig(out_png, dpi=150, bbox_inches="tight", facecolor="white")
    fig.savefig(out_svg, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out_png


def generate_data_flow_diagram() -> Path:
    import matplotlib.pyplot as plt

    ARCH.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(10, 6))
    ax.axis("off")
    ax.set_title("Prediction & Optimization Data Flow", fontsize=12, fontweight="bold")
    flow = (
        "Operator Recipe Input\n"
        "        ↓\n"
        "POST /predict  →  Phase 19 Model  →  TTT + Explainability\n"
        "        ↓\n"
        "POST /hybrid/evaluate  →  Phase 32  →  Reliability Index + Consensus\n"
        "        ↓\n"
        "POST /optimize  →  Phase 20.2  →  Production Recommendation\n"
        "POST /optimize/v2  →  Phase 31  →  Planning-Safe Alternative\n"
        "        ↓\n"
        "POST /validation  →  MAE / RMSE Tracking"
    )
    ax.text(0.5, 0.5, flow, transform=ax.transAxes, fontsize=11, va="center", ha="center",
            family="monospace", bbox=dict(boxstyle="round", facecolor="#f8f9fa", edgecolor="#dee2e6"))
    out = ARCH / "data_flow.png"
    fig.savefig(out, dpi=150, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return out


def copy_figures() -> tuple[int, int]:
    THESIS.mkdir(parents=True, exist_ok=True)
    PUB.mkdir(parents=True, exist_ok=True)
    t, p = 0, 0
    src_t = PHASE33 / "thesis_figures"
    src_p = PHASE33 / "publication_figures"
    if src_t.exists():
        for f in src_t.glob("*"):
            if f.suffix.lower() in {".png", ".svg", ".pdf"}:
                shutil.copy2(f, THESIS / f.name)
                t += 1
    if src_p.exists():
        for f in src_p.glob("*"):
            if f.suffix.lower() in {".png", ".svg", ".pdf"}:
                shutil.copy2(f, PUB / f.name)
                p += 1
    return t, p


def generate_technical_report_pdf() -> None:
    styles = _styles()
    pdf_path = RELEASE / "FINAL_TECHNICAL_REPORT.pdf"
    doc = SimpleDocTemplate(str(pdf_path), pagesize=A4, rightMargin=2 * cm, leftMargin=2 * cm, topMargin=2 * cm, bottomMargin=2 * cm)
    story = [
        Paragraph("JSPL EAF Tap-to-Tap Industrial AI Decision Support System", styles["H1Release"]),
        Paragraph("Final Technical Report — Release 1.0", styles["H2Release"]),
        Spacer(1, 0.3 * cm),
        Paragraph("Author: JSPL Internship Project | Institution: B.Tech Thesis", styles["BodyRelease"]),
        Paragraph(f"Date: {datetime.now(timezone.utc).strftime('%B %Y')}", styles["BodyRelease"]),
        Spacer(1, 0.5 * cm),
        Paragraph("Executive Summary", styles["H2Release"]),
        Paragraph(
            "This system integrates a frozen Phase 19 stacking regressor, Phase 20.2 physics-guided optimizer, "
            "Phase 31 planning-safe Optimizer V2, and Phase 32 hybrid trust framework into a unified FastAPI + Next.js "
            "platform for JSPL EAF tap-to-tap decision support. Release 1.0 focuses on production readiness, operator "
            "explainability, plant validation, and thesis/publication deliverables — not model retraining.",
            styles["BodyRelease"],
        ),
        Spacer(1, 0.3 * cm),
        Paragraph("System Components", styles["H2Release"]),
    ]
    data = [
        ["Component", "Phase", "Role", "Status"],
        ["Prediction Engine", "19", "TTT forecasting", "Production"],
        ["Optimizer", "20.2", "Recipe optimization", "Production"],
        ["Optimizer V2", "31", "Planning-safe search", "Research mode"],
        ["Hybrid Engine", "32", "Trust & consensus", "Integrated"],
        ["Explainability", "29", "SHAP + narratives", "Integrated"],
        ["Validation", "33", "Plant result tracking", "Integrated"],
    ]
    table = Table(data, colWidths=[4 * cm, 2 * cm, 5 * cm, 3 * cm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#34495E")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8f9fa")]),
    ]))
    story.append(table)
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Key Performance Indicators", styles["H2Release"]))
    story.append(Paragraph("• Test MAE: ~2.1–3.1 min (Phase 19 hold-out)", styles["BodyRelease"]))
    story.append(Paragraph("• Default recipe (120 t) prediction: ~39.9 min", styles["BodyRelease"]))
    story.append(Paragraph("• Hybrid Reliability Index: 68–78 / 100 on live HMI heats", styles["BodyRelease"]))
    story.append(Paragraph("• Optimizer V2: POWER field never modified", styles["BodyRelease"]))
    story.append(PageBreak())
    story.append(Paragraph("Research Pipeline (Frozen)", styles["H2Release"]))
    for phase in range(16, 34):
        story.append(Paragraph(f"Phase {phase}: Complete — artifacts frozen, no retraining in Release 1.0", styles["BodyRelease"]))
    story.append(Spacer(1, 0.5 * cm))
    story.append(Paragraph("Limitations", styles["H2Release"]))
    story.append(Paragraph("• Actual TTT for recent live heats pending MES import", styles["BodyRelease"]))
    story.append(Paragraph("• Digital twin sensor completeness gaps (Phase 27)", styles["BodyRelease"]))
    story.append(Paragraph("• Operator feedback does not trigger model retraining", styles["BodyRelease"]))
    doc.build(story)


def main() -> None:
    RELEASE.mkdir(parents=True, exist_ok=True)
    print("Generating architecture diagrams...")
    arch_png = generate_architecture_diagram()
    generate_data_flow_diagram()
    print(f"  {arch_png}")

    print("Copying thesis/publication figures...")
    t, p = copy_figures()
    print(f"  {t} thesis, {p} publication figures")

    print("Generating PDFs...")
    mappings = [
        (DOCS / "THESIS_APPENDIX.md", RELEASE / "THESIS_APPENDIX.pdf", "Thesis Appendix"),
        (DOCS / "USER_MANUAL.md", RELEASE / "USER_MANUAL.pdf", "User Manual"),
        (ROOT / "backend" / "API.md", RELEASE / "API_REFERENCE.pdf", "API Reference"),
        (DOCS / "SYSTEM_ARCHITECTURE.md", RELEASE / "SYSTEM_ARCHITECTURE.pdf", "System Architecture"),
        (DOCS / "DEPLOYMENT_GUIDE.md", RELEASE / "DEPLOYMENT_GUIDE.pdf", "Deployment Guide"),
    ]
    for md, pdf, title in mappings:
        md_to_pdf(md, pdf, title)
        print(f"  {pdf.name}")

    generate_technical_report_pdf()
    print(f"  FINAL_TECHNICAL_REPORT.pdf")
    print("Done.")


if __name__ == "__main__":
    main()

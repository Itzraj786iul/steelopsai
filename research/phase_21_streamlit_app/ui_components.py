"""Reusable Streamlit UI components and themes."""

from __future__ import annotations

from typing import Any

import pandas as pd
import streamlit as st

from config import (
    APP_VERSION,
    COMPANY_NAME,
    DATASET_LABEL,
    MODEL_NAME,
    N_FEATURES,
    OPTIMIZER_VERSION,
    TEST_MAE_MIN,
    TEST_R2,
)
from utils import build_operator_summary, live_validation_warnings


THEMES = {
    "Light": {
        "bg": "#F7F9FC",
        "sidebar": "#EEF2F7",
        "primary": "#0B3D6B",
        "card": "linear-gradient(135deg, #0B3D6B 0%, #14508C 100%)",
        "text": "#1A2B3C",
    },
    "Dark": {
        "bg": "#0F1419",
        "sidebar": "#1A2332",
        "primary": "#4A9FE8",
        "card": "linear-gradient(135deg, #1A3A5C 0%, #0B3D6B 100%)",
        "text": "#E8EDF2",
    },
    "Auto": {
        "bg": "#F7F9FC",
        "sidebar": "#EEF2F7",
        "primary": "#0B3D6B",
        "card": "linear-gradient(135deg, #0B3D6B 0%, #14508C 100%)",
        "text": "#1A2B3C",
    },
}


def apply_theme(theme_name: str) -> None:
    theme = THEMES.get(theme_name, THEMES["Light"])
    st.markdown(
        f"""
        <style>
            .stApp {{ background-color: {theme['bg']}; }}
            div[data-testid="stSidebar"] {{ background-color: {theme['sidebar']}; }}
            .main-header {{ font-size: 1.75rem; font-weight: 700; color: {theme['primary']};
                margin-bottom: 0.25rem; font-family: 'Segoe UI', Arial, sans-serif; }}
            .sub-header {{ color: #5A6B7D; font-size: 0.95rem; margin-bottom: 1.25rem; }}
            .metric-card {{
                background: {theme['card']}; color: white; padding: 1.4rem 1.6rem;
                border-radius: 10px; text-align: center; margin: 0.5rem auto; max-width: 420px;
                box-shadow: 0 4px 14px rgba(11,61,107,0.15);
            }}
            .metric-card h2 {{ margin: 0; font-size: 2.4rem; font-weight: 700; }}
            .metric-card p {{ margin: 0.35rem 0 0 0; opacity: 0.92; font-size: 0.9rem; }}
            .kpi-card {{
                background: white; border: 1px solid #DDE4EC; border-radius: 8px;
                padding: 1rem 1.2rem; text-align: center; min-height: 100px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.04);
            }}
            .kpi-card h3 {{ margin: 0; color: {theme['primary']}; font-size: 1.5rem; }}
            .kpi-card p {{ margin: 0.3rem 0 0 0; color: #5A6B7D; font-size: 0.85rem; }}
            .summary-card {{
                background: white; border-left: 5px solid {theme['primary']};
                padding: 1.2rem 1.4rem; border-radius: 6px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.06);
            }}
            .status-good {{ color: #1B7A3D; font-weight: 700; font-size: 1.4rem; }}
            .block-container {{ padding-top: 1.5rem; max-width: 1200px; }}
        </style>
        """,
        unsafe_allow_html=True,
    )


def page_header(title: str, subtitle: str) -> None:
    st.markdown(f'<p class="main-header">{title}</p>', unsafe_allow_html=True)
    st.markdown(f'<p class="sub-header">{subtitle}</p>', unsafe_allow_html=True)


def render_dashboard() -> None:
    page_header(
        "EAF Tap-to-Tap Time Prediction System",
        f"{COMPANY_NAME} Industrial Decision Support — Production Version {APP_VERSION}",
    )
    st.markdown("---")

    c1, c2, c3, c4 = st.columns(4)
    kpis = [
        ("MAE", f"{TEST_MAE_MIN:.2f} min", "Prediction Accuracy"),
        ("R²", f"{TEST_R2:.3f}", "Test Set"),
        ("Features", str(N_FEATURES), "Production Set"),
        ("Optimizer", "20.2", "Physics Guided"),
    ]
    for col, (title, val, sub) in zip([c1, c2, c3, c4], kpis):
        with col:
            st.markdown(
                f'<div class="kpi-card"><h3>{val}</h3><p><b>{title}</b><br>{sub}</p></div>',
                unsafe_allow_html=True,
            )

    st.markdown("")
    c1, c2 = st.columns(2)
    with c1:
        st.markdown("### System Overview")
        st.markdown(
            f"""
| Component | Detail |
|-----------|--------|
| **Model** | {MODEL_NAME} |
| **Dataset** | {DATASET_LABEL} |
| **Optimizer** | {OPTIMIZER_VERSION} |
| **Version** | {APP_VERSION} |
            """
        )
    with c2:
        st.markdown("### Quick Start")
        st.markdown(
            """
1. Open **TTT Prediction** and enter heat inputs.
2. Review the **Operator Summary** and confidence interval.
3. Run **Recipe Optimizer** for physics-guided recommendations.
4. Export reports from **Prediction Report**.
            """
        )

    if st.session_state.get("prediction") is not None:
        st.markdown("---")
        st.markdown("### Latest Session Prediction")
        pred = st.session_state.prediction
        m1, m2, m3 = st.columns(3)
        m1.metric("Last Predicted TTT", f"{pred.predicted_ttt:.2f} min")
        m2.metric("Confidence", f"+/- {pred.margin:.1f} min")
        m3.metric("95% Interval", f"{pred.ci_lower_95:.1f} – {pred.ci_upper_95:.1f} min")


def render_live_validation(recipe: dict[str, Any], stats: pd.DataFrame) -> None:
    warnings = live_validation_warnings(recipe, stats)
    if not warnings:
        st.success("All inputs within expected operating ranges.")
        return
    for level, message in warnings:
        if level == "error":
            st.error(message)
        elif level == "warning":
            st.warning(message)
        else:
            st.info(message)


def render_operator_summary_card(
    recipe: dict[str, Any],
    prediction: Any,
    stats: pd.DataFrame,
    optimization: Any | None = None,
) -> None:
    summary = build_operator_summary(recipe, prediction, stats, optimization)
    st.markdown('<div class="summary-card">', unsafe_allow_html=True)
    st.markdown("#### Overall Process Status")
    status_class = "status-good" if summary["process_status"] in {"GOOD", "STABLE"} else ""
    st.markdown(
        f'<p class="{status_class}">{summary["process_status"]}</p>',
        unsafe_allow_html=True,
    )

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Prediction", f"{summary['prediction_min']:.1f} min")
    c2.metric("Confidence", summary["confidence"])
    c3.metric("Expected Quality", summary["expected_quality"])
    c4.metric("Risk", summary["risk"])

    st.markdown("**Recommendations**")
    for rec in summary["recommendations"]:
        st.markdown(f"- {rec}")
    st.markdown("</div>", unsafe_allow_html=True)


def render_about_page() -> None:
    page_header("About", "JSPL EAF TTT Decision Support — Technical Overview")
    st.markdown(
        f"""
### Pipeline Timeline
| Phase | Description |
|-------|-------------|
| 1–12 | Data ingestion, cleaning, and exploratory analysis |
| 13 | Industrial data cleaning |
| 16 | Feature engineering |
| 17–18 | Feature selection (22 production features) |
| 19 | Model development — **{MODEL_NAME}** |
| 20.2 | Physics-guided recipe optimizer |
| 21–22 | Streamlit decision support application |

### Model
- **Algorithm:** {MODEL_NAME} (CatBoost + XGBoost + HistGradientBoosting + LightGBM)
- **Features:** {N_FEATURES} (from `final_features_25.csv`)
- **Test MAE:** {TEST_MAE_MIN:.2f} min | **Test R²:** {TEST_R2:.3f}

### Technology Stack
Python 3.10+, Streamlit, scikit-learn, LightGBM, CatBoost, XGBoost, Plotly, ReportLab, Pandas

### Author
JSPL Internship Project — Industrial AI for Electric Arc Furnace Tap-to-Tap Time Prediction

### License
Internal use — JSPL. Contact project supervisor for redistribution.
        """
    )

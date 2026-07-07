"""
JSPL EAF Tap-to-Tap Time Decision Support System
Phase 22 — Production polish, validation and research packaging.
"""

from __future__ import annotations

import tempfile
from datetime import datetime

import pandas as pd
import streamlit as st

from charts import build_radial_gauge, build_tornado_chart, build_waterfall_chart, build_distribution_chart
from config import ASSETS_DIR, BURDEN_COLS, CONTROLLABLE_NUMERIC
from feature_engineering import normalize_shift
from logging_service import log_optimizer, log_prediction, log_user_action
from optimizer_engine import OptimizerEngine
from prediction_engine import PredictionEngine
from ui_components import (
    apply_theme,
    page_header,
    render_about_page,
    render_dashboard,
    render_live_validation,
    render_operator_summary_card,
)
from utils import (
    arrow_for_delta,
    append_session_history,
    build_csv_export,
    build_json_export,
    build_operator_summary,
    generate_industrial_interpretation,
    generate_pdf_report,
    historical_comparison_table,
    load_historical_raw,
    process_health_table,
    session_history_dataframe,
    total_charge,
    validate_recipe,
)

st.set_page_config(
    page_title="JSPL EAF TTT Decision Support",
    page_icon=str(ASSETS_DIR / "logo.png"),
    layout="wide",
    initial_sidebar_state="expanded",
)

PAGES = [
    "Dashboard",
    "TTT Prediction",
    "Recipe Optimizer",
    "What-if Analysis",
    "Historical Comparison",
    "Process Health",
    "Prediction Report",
    "Session History",
    "About",
]


@st.cache_resource(show_spinner="Loading production model...")
def get_prediction_engine() -> PredictionEngine:
    return PredictionEngine()


@st.cache_resource(show_spinner="Loading Phase 20.2 optimizer...")
def get_optimizer_engine() -> OptimizerEngine:
    return OptimizerEngine()


@st.cache_data(show_spinner=False)
def get_historical_stats() -> pd.DataFrame:
    from utils import load_historical_stats
    return load_historical_stats()


def init_session_state() -> None:
    defaults = {
        "recipe": None,
        "prediction": None,
        "optimization": None,
        "interpretations": [],
        "session_history": [],
        "theme": "Light",
    }
    for key, val in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = val
    if st.session_state.recipe is None:
        from utils import default_recipe
        st.session_state.recipe = default_recipe()


def sidebar() -> str:
    logo = ASSETS_DIR / "logo.png"
    if logo.exists():
        st.sidebar.image(str(logo), use_container_width=True)
    st.sidebar.markdown("## JSPL")
    st.sidebar.markdown("### EAF TTT Prediction System")
    st.sidebar.caption("Production v2.0")
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Model**  \nStacking Regressor")
    st.sidebar.markdown("**Optimizer**  \nPhase 20.2")
    st.sidebar.markdown("---")
    st.session_state.theme = st.sidebar.selectbox("Theme", ["Light", "Dark", "Auto"], index=0)
    page = st.sidebar.radio("Navigation", PAGES, label_visibility="collapsed")
    return page


def recipe_input_form(key_prefix: str = "") -> dict:
    r = st.session_state.recipe
    with st.container():
        c1, c2, c3 = st.columns(3)
        recipe = {}
        with c1:
            recipe["HM"] = st.number_input("HM (t)", value=float(r["HM"]), min_value=0.0, step=0.1, key=f"{key_prefix}hm")
            recipe["DRI"] = st.number_input("DRI (t)", value=float(r["DRI"]), min_value=0.0, step=0.1, key=f"{key_prefix}dri")
            recipe["HBI"] = st.number_input("HBI (t)", value=float(r["HBI"]), min_value=0.0, step=0.1, key=f"{key_prefix}hbi")
            recipe["Bucket"] = st.number_input("Bucket (t)", value=float(r["Bucket"]), min_value=0.0, step=0.1, key=f"{key_prefix}bucket")
        with c2:
            recipe["LIME"] = st.number_input("LIME (t)", value=float(r["LIME"]), min_value=0.0, step=0.1, key=f"{key_prefix}lime")
            recipe["DOLO"] = st.number_input("DOLO (t)", value=float(r["DOLO"]), min_value=0.0, step=0.1, key=f"{key_prefix}dolo")
            recipe["CPC"] = st.number_input("CPC", value=float(r["CPC"]), min_value=0.0, step=1.0, key=f"{key_prefix}cpc")
        with c3:
            recipe["POWER"] = st.number_input("POWER", value=float(r["POWER"]), min_value=0.0, step=10.0, key=f"{key_prefix}power")
            recipe["OXY"] = st.number_input("OXY", value=float(r["OXY"]), min_value=0.0, step=1.0, key=f"{key_prefix}oxy")
            recipe["Shift"] = st.selectbox(
                "Shift", ["A", "B", "C"],
                index=["A", "B", "C"].index(normalize_shift(r["Shift"])),
                key=f"{key_prefix}shift",
            )
            recipe["Power_Restriction"] = st.selectbox(
                "Power Restriction", [0, 1],
                index=int(r.get("Power_Restriction", 0)),
                format_func=lambda x: "No restriction" if x == 0 else "Restriction active",
                key=f"{key_prefix}pwr",
            )
    st.caption(f"Total charge: **{sum(recipe[c] for c in BURDEN_COLS):.1f} t**")
    return recipe


def page_prediction(engine: PredictionEngine, stats: pd.DataFrame) -> None:
    page_header("TTT Prediction", "Predict tap-to-tap time from current heat inputs.")

    with st.container():
        recipe = recipe_input_form("pred_")
        render_live_validation(recipe, stats)

    tab_pred, tab_summary = st.tabs(["Prediction", "Operator Summary"])

    with tab_pred:
        if st.button("Predict TTT", type="primary"):
            ok, errors = validate_recipe(recipe)
            if not ok:
                for err in errors:
                    st.error(err)
            else:
                st.session_state.recipe = recipe
                result = engine.predict_with_interval(recipe)
                st.session_state.prediction = result
                st.session_state.interpretations = generate_industrial_interpretation(
                    recipe, result.predicted_ttt, stats, result.top_contributors,
                )
                log_prediction(recipe, result.predicted_ttt)
                log_user_action("predict", f"ttt={result.predicted_ttt:.2f}")
                entry = {
                    "timestamp": datetime.now().isoformat(timespec="seconds"),
                    "predicted_ttt": result.predicted_ttt,
                    "hm": recipe["HM"], "dri": recipe["DRI"],
                    "power": recipe["POWER"], "shift": recipe["Shift"],
                    "charge_t": total_charge(recipe),
                }
                st.session_state.session_history = append_session_history(
                    entry, st.session_state.session_history,
                )

        if st.session_state.prediction is not None:
            result = st.session_state.prediction
            _, c_mid, c2, c3 = st.columns([1, 2, 1, 1])
            with c_mid:
                st.markdown(
                    f'<div class="metric-card"><p>Predicted TTT</p>'
                    f'<h2>{result.predicted_ttt:.2f}</h2><p>minutes</p></div>',
                    unsafe_allow_html=True,
                )
            c2.metric("Confidence", f"+/- {result.margin:.1f} min")
            c3.metric("95% Interval", f"{result.ci_lower_95:.1f} – {result.ci_upper_95:.1f}")

            st.plotly_chart(build_waterfall_chart(result.contributions, result.predicted_ttt), use_container_width=True)
            disp = result.top_contributors[["display_name", "contribution", "global_importance"]].copy()
            disp.columns = ["Feature", "Contribution (min)", "Global Importance"]
            st.dataframe(disp, use_container_width=True, hide_index=True)

    with tab_summary:
        if st.session_state.prediction is not None:
            render_operator_summary_card(
                st.session_state.recipe, st.session_state.prediction, stats,
                st.session_state.optimization,
            )
        else:
            st.info("Run a prediction to view the operator summary.")


def page_optimizer(opt_engine: OptimizerEngine) -> None:
    page_header("Recipe Optimizer", "Physics-guided local optimization (Phase 20.2).")
    recipe = st.session_state.recipe

    if st.button("Run Optimizer", type="primary"):
        ok, errors = validate_recipe(recipe)
        if not ok:
            for err in errors:
                st.error(err)
        else:
            with st.spinner("Running optimizer..."):
                opt = opt_engine.optimize(recipe, power_restriction=int(recipe.get("Power_Restriction", 0)))
            st.session_state.optimization = opt
            log_optimizer(recipe, opt.current_ttt, opt.optimized_ttt, opt.improvement_min, opt.physics_compliant)
            log_user_action("optimize", f"improvement={opt.improvement_min:.2f}")

    opt = st.session_state.optimization
    if opt is None:
        st.warning("Press 'Run Optimizer' to generate recommendations.")
        return

    m1, m2, m3 = st.columns(3)
    m1.metric("Current", f"{opt.current_ttt:.2f} min")
    m2.metric("Optimized", f"{opt.optimized_ttt:.2f} min", delta=f"-{opt.improvement_min:.2f} min", delta_color="inverse")
    m3.metric("Expected Saving", f"{opt.improvement_min:.2f} min")

    rows = []
    for col in CONTROLLABLE_NUMERIC:
        cur, rec = float(recipe[col]), float(opt.optimized_recipe[col])
        delta = rec - cur
        pct = (delta / cur * 100) if abs(cur) > 1e-6 else 0.0
        rows.append({
            "Variable": col,
            "Current": f"{cur:.2f}",
            "Optimized": f"{rec:.2f}",
            "Difference": f"{delta:+.2f}",
            "Pct": f"{pct:+.1f}%",
            "Arrow": arrow_for_delta(delta, col),
            "Reason": opt_engine.explain_change(col, cur, rec, bool(opt.power_restriction)),
            "Physics": opt_engine.physics_status(col, recipe, opt.optimized_recipe, bool(opt.power_restriction)),
        })

    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)
    st.caption(f"Physics compliant: **{'YES' if opt.physics_compliant else 'NO'}** | Score: {opt.best_score:.2f}")


def page_whatif(engine: PredictionEngine) -> None:
    page_header("What-if Analysis", "Interactive tornado sensitivity with live prediction.")
    base = dict(st.session_state.recipe)
    c1, c2 = st.columns(2)
    with c1:
        base["HM"] = st.slider("HM (t)", 40.0, 80.0, float(base["HM"]), 0.1)
        base["DRI"] = st.slider("DRI (t)", 30.0, 75.0, float(base["DRI"]), 0.1)
        base["Bucket"] = st.slider("Bucket (t)", 0.0, 35.0, float(base["Bucket"]), 0.5)
    with c2:
        base["POWER"] = st.slider("POWER", 25000.0, 42000.0, float(base["POWER"]), 50.0)
        base["OXY"] = st.slider("OXY", 2500.0, 5000.0, float(base["OXY"]), 10.0)
        base["CPC"] = st.slider("CPC", 200.0, 1200.0, float(base["CPC"]), 5.0)

    try:
        pred = engine.predict(base)
        st.metric("Live Predicted TTT", f"{pred:.2f} min")
        st.plotly_chart(build_tornado_chart(base, engine.predict), use_container_width=True)
    except Exception as exc:
        st.error(f"Prediction failed: {exc}")


def page_historical(stats: pd.DataFrame, raw: pd.DataFrame) -> None:
    page_header("Historical Comparison", "Compare current recipe against plant operating history.")
    recipe = st.session_state.recipe
    table = historical_comparison_table(recipe, stats)

    def _style(val: str) -> str:
        return {"Below normal": "background-color:#FFF3CD", "Above normal": "background-color:#F8D7DA"}.get(val, "background-color:#D4EDDA")

    st.dataframe(
        table.style.map(_style, subset=["Status"]).format(
            {"Current": "{:.2f}", "P5": "{:.2f}", "Median": "{:.2f}", "P95": "{:.2f}"}
        ),
        use_container_width=True, hide_index=True,
    )

    var = st.selectbox("Distribution plot", CONTROLLABLE_NUMERIC)
    st.plotly_chart(
        build_distribution_chart(var, float(recipe[var]), stats.loc[var], raw[var]),
        use_container_width=True,
    )


def page_health(stats: pd.DataFrame) -> None:
    page_header("Process Health", "Radial gauges vs Phase 13 operating windows.")
    health = process_health_table(st.session_state.recipe, stats)
    cols = st.columns(3)
    for idx, (_, row) in enumerate(health.iterrows()):
        with cols[idx % 3]:
            st.plotly_chart(
                build_radial_gauge(row["Gauge"], row["Value"], row["P5"], row["P95"], row["Status"]),
                use_container_width=True,
            )


def page_report(engine: PredictionEngine, stats: pd.DataFrame) -> None:
    page_header("Prediction Report", "Export JSON, CSV, and PDF reports.")
    recipe = st.session_state.recipe
    if st.session_state.prediction is None:
        ok, _ = validate_recipe(recipe)
        if ok:
            st.session_state.prediction = engine.predict_with_interval(recipe)
            st.session_state.interpretations = generate_industrial_interpretation(
                recipe, st.session_state.prediction.predicted_ttt, stats,
                st.session_state.prediction.top_contributors,
            )

    pred, opt = st.session_state.prediction, st.session_state.optimization
    if pred is None:
        st.warning("Run a prediction first.")
        return

    summary = build_operator_summary(recipe, pred, stats, opt)
    comparison = historical_comparison_table(recipe, stats)

    c1, c2, c3 = st.columns(3)
    c1.download_button("Download JSON", build_json_export(recipe, pred, opt), "eaf_ttt_report.json", "application/json")
    c2.download_button("Download CSV", build_csv_export(recipe, pred, opt), "eaf_ttt_report.csv", "text/csv")

    if c3.button("Generate PDF"):
        chart_path = None
        try:
            import plotly.io as pio
            with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
                pio.write_image(build_waterfall_chart(pred.contributions, pred.predicted_ttt), tmp.name, width=900, height=500)
                chart_path = tmp.name
        except Exception:
            pass
        pdf = generate_pdf_report(
            recipe, pred, opt, st.session_state.interpretations,
            comparison, pred.contributions, operator_summary=summary, chart_path=chart_path,
        )
        st.download_button("Download PDF", pdf, "eaf_ttt_report.pdf", "application/pdf")
        log_user_action("export_pdf")


def page_session_history() -> None:
    page_header("Session History", "Last 10 predictions in this session.")
    df = session_history_dataframe(st.session_state.session_history)
    st.dataframe(df, use_container_width=True, hide_index=True)
    if not df.empty:
        st.download_button("Export history CSV", df.to_csv(index=False), "session_history.csv", "text/csv")


def main() -> None:
    init_session_state()
    page = sidebar()
    apply_theme(st.session_state.theme)
    stats = get_historical_stats()
    raw = load_historical_raw()

    if page == "Dashboard":
        render_dashboard()
    elif page == "TTT Prediction":
        page_prediction(get_prediction_engine(), stats)
    elif page == "Recipe Optimizer":
        page_optimizer(get_optimizer_engine())
    elif page == "What-if Analysis":
        page_whatif(get_prediction_engine())
    elif page == "Historical Comparison":
        page_historical(stats, raw)
    elif page == "Process Health":
        page_health(stats)
    elif page == "Prediction Report":
        page_report(get_prediction_engine(), stats)
    elif page == "Session History":
        page_session_history()
    elif page == "About":
        render_about_page()


if __name__ == "__main__":
    main()

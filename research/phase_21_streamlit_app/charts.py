"""Plotly chart builders for the Streamlit application."""

from __future__ import annotations

from typing import Any, Callable

import numpy as np
import pandas as pd
import plotly.graph_objects as go
from plotly.subplots import make_subplots


def build_waterfall_chart(contributions: pd.DataFrame, prediction: float) -> go.Figure:
    top = contributions.head(8).sort_values("contribution")
    labels = [f.replace("_", " ") for f in top["feature"]]
    values = top["contribution"].tolist()
    fig = go.Figure(
        go.Waterfall(
            orientation="v",
            measure=["relative"] * len(values) + ["total"],
            x=labels + ["Predicted TTT"],
            y=values + [prediction - sum(values)],
            connector={"line": {"color": "#0B3D6B"}},
            increasing={"marker": {"color": "#1B7A3D"}},
            decreasing={"marker": {"color": "#B83232"}},
            totals={"marker": {"color": "#0B3D6B"}},
        )
    )
    fig.update_layout(
        title="Feature Contribution",
        template="plotly_white",
        height=400,
        margin=dict(l=24, r=24, t=48, b=72),
        font=dict(family="Segoe UI, Arial, sans-serif", size=12),
    )
    return fig


def build_tornado_chart(
    base_recipe: dict[str, Any],
    predict_fn: Callable[[dict[str, Any]], float],
    variables: list[str] | None = None,
    delta_pct: float = 0.05,
) -> go.Figure:
    variables = variables or ["HM", "DRI", "POWER", "OXY", "CPC", "Bucket"]
    base_pred = predict_fn(base_recipe)
    low_deltas: list[float] = []
    high_deltas: list[float] = []
    labels: list[str] = []

    for var in variables:
        base_val = float(base_recipe[var])
        span = max(base_val * delta_pct, 1.0 if var not in {"POWER", "OXY"} else 100.0)
        low_recipe = dict(base_recipe)
        high_recipe = dict(base_recipe)
        low_recipe[var] = max(0.0, base_val - span)
        high_recipe[var] = base_val + span
        low_pred = predict_fn(low_recipe)
        high_pred = predict_fn(high_recipe)
        labels.append(var)
        low_deltas.append(low_pred - base_pred)
        high_deltas.append(high_pred - base_pred)

    fig = go.Figure()
    fig.add_trace(go.Bar(y=labels, x=low_deltas, orientation="h", name="Decrease", marker_color="#B83232"))
    fig.add_trace(go.Bar(y=labels, x=high_deltas, orientation="h", name="Increase", marker_color="#1B7A3D"))
    fig.add_vline(x=0, line_color="#333", line_width=1)
    fig.update_layout(
        title=f"Tornado Sensitivity (baseline TTT = {base_pred:.2f} min)",
        template="plotly_white",
        barmode="overlay",
        height=380,
        xaxis_title="Change in TTT (min)",
        font=dict(family="Segoe UI, Arial, sans-serif"),
        legend=dict(orientation="h", yanchor="bottom", y=1.02),
    )
    return fig


def build_radial_gauge(
    label: str,
    value: float,
    p5: float,
    p95: float,
    status: str,
) -> go.Figure:
    span = max(p95 - p5, 1e-6)
    norm = (value - p5) / span * 100
    norm = float(np.clip(norm, 0, 100))
    color_map = {
        "Excellent": "#1B7A3D",
        "Good": "#0B3D6B",
        "Warning": "#C9A227",
        "Out of Practice": "#B83232",
    }
    fig = go.Figure(
        go.Indicator(
            mode="gauge+number",
            value=norm,
            number={"suffix": f" | {value:.1f}", "font": {"size": 22}},
            title={"text": f"{label}<br><span style='font-size:0.75em'>{status}</span>"},
            gauge={
                "axis": {"range": [0, 100], "ticksuffix": "%"},
                "bar": {"color": color_map.get(status, "#0B3D6B")},
                "steps": [
                    {"range": [0, 25], "color": "#F8D7DA"},
                    {"range": [25, 75], "color": "#E8F0F8"},
                    {"range": [75, 100], "color": "#D4EDDA"},
                ],
                "threshold": {"line": {"color": "#333", "width": 2}, "value": norm},
            },
        )
    )
    fig.update_layout(height=260, margin=dict(l=20, r=20, t=60, b=10), font=dict(family="Segoe UI, Arial"))
    return fig


def build_distribution_chart(
    variable: str,
    current: float,
    stats_row: pd.Series,
    historical: pd.Series,
) -> go.Figure:
    fig = go.Figure()
    fig.add_trace(
        go.Histogram(
            x=historical.dropna(),
            nbinsx=30,
            name="Plant history",
            marker_color="rgba(11, 61, 107, 0.55)",
        )
    )
    for val, name, color in [
        (stats_row["p5"], "P5", "#C9A227"),
        (stats_row["median"], "Median", "#0B3D6B"),
        (stats_row["p95"], "P95", "#C9A227"),
        (current, "Current", "#B83232"),
    ]:
        fig.add_vline(x=val, line_dash="dash", line_color=color, annotation_text=name, annotation_position="top")
    fig.update_layout(
        title=f"{variable} — Historical Distribution",
        xaxis_title=variable,
        yaxis_title="Count",
        template="plotly_white",
        height=320,
        showlegend=False,
        font=dict(family="Segoe UI, Arial, sans-serif"),
    )
    return fig

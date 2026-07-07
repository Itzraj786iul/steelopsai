"""Pydantic request/response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class RecipeInput(BaseModel):
    HM: float = Field(..., ge=0, description="Hot metal (tonnes)")
    DRI: float = Field(..., ge=0, description="DRI (tonnes)")
    HBI: float = Field(0, ge=0, description="HBI (tonnes)")
    Bucket: float = Field(0, ge=0, description="Scrap bucket (tonnes)")
    LIME: float = Field(..., ge=0)
    DOLO: float = Field(0, ge=0)
    CPC: float = Field(..., ge=0)
    POWER: float = Field(..., ge=0)
    OXY: float = Field(..., ge=0)
    Shift: Literal["A", "B", "C"] = "C"
    Power_Restriction: int = Field(0, ge=0, le=1)

    @field_validator("Shift", mode="before")
    @classmethod
    def normalize_shift(cls, v: str) -> str:
        s = str(v).strip().upper()
        return s if s in {"A", "B", "C"} else "C"

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class PredictRequest(RecipeInput):
    pass


class OptimizeRequest(RecipeInput):
    n_generate: int = Field(1000, ge=100, le=2000)


class WhatIfRequest(RecipeInput):
    variables: list[str] | None = None


class ContributorItem(BaseModel):
    feature: str
    display_name: str
    contribution: float
    global_importance: float


class PredictionResponse(BaseModel):
    predicted_ttt: float
    margin: float
    ci_lower_95: float
    ci_upper_95: float
    top_contributors: list[ContributorItem]
    operator_summary: dict[str, Any]
    validation_warnings: list[dict[str, str]]


class OptimizationComparisonRow(BaseModel):
    variable: str
    current: float
    optimized: float
    difference: float
    pct_change: float
    arrow: str
    reason: str
    physics_status: str


class OptimizeResponse(BaseModel):
    current_recipe: dict[str, Any]
    optimized_recipe: dict[str, Any]
    current_ttt: float
    optimized_ttt: float
    improvement_min: float
    physics_compliant: bool
    best_score: float
    comparison: list[OptimizationComparisonRow]
    diagnostics: dict[str, Any]


class WhatIfTornadoItem(BaseModel):
    variable: str
    low_delta: float
    high_delta: float


class WhatIfResponse(BaseModel):
    predicted_ttt: float
    baseline_ttt: float
    tornado: list[WhatIfTornadoItem]


class HistoricalVariable(BaseModel):
    variable: str
    current: float
    p5: float
    median: float
    p95: float
    status: str


class HistoricalResponse(BaseModel):
    variables: list[HistoricalVariable]
    distribution: dict[str, list[float]] | None = None


class ModelInfoResponse(BaseModel):
    model_name: str
    optimizer_version: str
    n_features: int
    test_mae: float
    test_r2: float
    ci_half_width_95: float
    dataset: str
    features: list[str]
    artifacts: dict[str, str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    optimizer_loaded: bool
    version: str


class ProcessHealthItem(BaseModel):
    gauge: str
    value: float
    p5: float
    median: float
    p95: float
    status: str
    color: Literal["green", "yellow", "red"]


class ProcessHealthResponse(BaseModel):
    items: list[ProcessHealthItem]


class ReportRequest(BaseModel):
    recipe: RecipeInput
    include_optimization: bool = True
    format: Literal["json", "csv", "pdf"] = "json"

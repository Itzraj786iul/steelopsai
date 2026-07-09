"""Pydantic request/response models."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator


class RecipeInput(BaseModel):
    """Heat recipe inputs. Internal field names are preserved; display labels are applied in responses."""

    HM: float = Field(..., description="Hot metal charge (tonnes)")
    DRI: float = Field(..., description="Direct reduced iron (tonnes)")
    HBI: float = Field(0, description="Hot briquetted iron (tonnes)")
    Bucket: float = Field(0, description="Scrap bucket charge (tonnes)")
    LIME: float = Field(..., description="Lime flux (tonnes)")
    DOLO: float = Field(0, description="Dolomite flux (tonnes)")
    CPC: float = Field(..., description="Carbon paste consumption")
    POWER: float = Field(..., description="Electrical Energy Consumed (kWh) — recorded after heat completion")
    OXY: float = Field(..., description="Oxygen consumption (Nm³)")
    Shift: Literal["A", "B", "C"] = Field("C", description="Operating shift")
    Power_Restriction: int = Field(0, ge=0, le=1, description="Electrical restriction flag (0=inactive, 1=active)")

    @field_validator("Shift", mode="before")
    @classmethod
    def normalize_shift(cls, v: str) -> str:
        s = str(v).strip().upper()
        return s if s in {"A", "B", "C"} else "C"

    @field_validator(
        "HM", "DRI", "HBI", "Bucket", "LIME", "DOLO", "CPC", "POWER", "OXY", mode="before"
    )
    @classmethod
    def coerce_numeric(cls, v: Any) -> float:
        if v is None or (isinstance(v, str) and not str(v).strip()):
            return 0.0
        try:
            return float(v)
        except (TypeError, ValueError):
            return 0.0

    def to_dict(self) -> dict[str, Any]:
        return self.model_dump()


class PredictRequest(RecipeInput):
    pass


class OptimizeRequest(RecipeInput):
    n_generate: int = Field(1000, ge=100, le=2000, description="Candidate recipes evaluated by the optimizer")


class WhatIfRequest(RecipeInput):
    variables: list[str] | None = Field(
        default=None,
        description="Variables to perturb. Defaults to HM, DRI, POWER, OXY, CPC, Bucket.",
    )


class ContributorItem(BaseModel):
    feature: str
    display_name: str
    contribution: float
    global_importance: float


class PredictionMetadata(BaseModel):
    model_version: str
    pipeline: str
    optimizer: str
    prediction_timestamp: str
    confidence: str
    warnings: list[str]


class ValidationWarning(BaseModel):
    level: Literal["warning", "info"] = "warning"
    message: str


class PredictionResponse(BaseModel):
    predicted_ttt: float = Field(..., description="Predicted tap-to-tap time (minutes)")
    margin: float = Field(..., description="Model test MAE margin used for confidence banding (minutes)")
    ci_lower_95: float = Field(..., description="Lower bound of approximate 95% interval (minutes)")
    ci_upper_95: float = Field(..., description="Upper bound of approximate 95% interval (minutes)")
    top_contributors: list[ContributorItem] = Field(..., description="Local SHAP-style contributors")
    operator_summary: dict[str, Any] = Field(..., description="Industrial operator summary")
    validation_warnings: list[ValidationWarning] = Field(default_factory=list, description="Advisory warnings — predictions are never blocked")
    confidence: str = Field(..., description="High | Medium | Low | Very Low based on historical operating statistics")
    charge_classification: str = Field(..., description="Normal | Low | High | Very High | Extreme")
    metadata: PredictionMetadata


class OptimizationComparisonRow(BaseModel):
    variable: str
    display_name: str | None = None
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
    current_ttt: float = Field(..., description="Predicted TTT for current recipe (minutes)")
    optimized_ttt: float = Field(..., description="Predicted TTT for optimized recipe (minutes)")
    improvement_min: float = Field(..., description="Expected tap-to-tap improvement (minutes)")
    physics_compliant: bool
    best_score: float
    comparison: list[OptimizationComparisonRow]
    diagnostics: dict[str, Any]


class WhatIfTornadoItem(BaseModel):
    variable: str
    display_name: str | None = None
    low_delta: float
    high_delta: float


class WhatIfResponse(BaseModel):
    predicted_ttt: float
    baseline_ttt: float
    tornado: list[WhatIfTornadoItem]


class HistoricalVariable(BaseModel):
    variable: str
    display_name: str | None = None
    current: float
    p5: float
    median: float
    p95: float
    status: str


class HistoricalResponse(BaseModel):
    variables: list[HistoricalVariable]
    distribution: dict[str, list[float]] | None = None


class HistoricalStatisticVariable(BaseModel):
    variable: str
    display_name: str
    min: float
    p5: float
    median: float
    p95: float
    max: float
    mean: float
    std: float


class HistoricalStatisticsResponse(BaseModel):
    variables: list[HistoricalStatisticVariable]
    generated_at: str


class ModelInfoResponse(BaseModel):
    model_name: str
    optimizer_version: str
    n_features: int
    test_mae: float
    test_r2: float
    ci_half_width_95: float
    dataset: str
    features: list[str]
    feature_labels: list[str] | None = None
    artifacts: dict[str, str]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    optimizer_loaded: bool
    historical_statistics_loaded: bool = False
    version: str
    frontend_version: str | None = None
    backend_version: str | None = None
    production_model: str | None = None
    optimizer_version: str | None = None
    research_version: str | None = None
    dataset_version: str | None = None
    git_commit: str | None = None
    build_date: str | None = None
    timestamp: str | None = None


class VersionRegistryResponse(BaseModel):
    frontend_version: str
    backend_version: str
    research_phase: str
    model_phase: str
    optimizer_phase: str
    dataset_version: str
    git_commit: str
    build_date: str


class ProcessHealthItem(BaseModel):
    gauge: str
    display_name: str | None = None
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


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None

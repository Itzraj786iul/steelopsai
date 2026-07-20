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
    interpretation: str | None = None
    direction: str | None = None


class SimilarHeatItem(BaseModel):
    heat_id: str
    shift: str
    charge_t: float
    actual_ttt: float | None = None
    predicted_ttt: float
    ttt_difference: float | None = None
    similarity_pct: float
    recipe_similarity_pct: float | None = None
    outcome_similarity_pct: float | None = None
    distance: float
    rank: int | None = None
    recipe_deltas: dict[str, float] = Field(default_factory=dict)
    truly_similar: bool = False
    # Controllable recipe snapshot from historical row (for operator comparison)
    HM: float | None = None
    DRI: float | None = None
    HBI: float | None = None
    Bucket: float | None = None
    LIME: float | None = None
    DOLO: float | None = None
    CPC: float | None = None
    POWER: float | None = None
    OXY: float | None = None
    Power_Restriction: int | None = None


class NeighborTttBenchmark(BaseModel):
    n: int
    mean_actual_ttt: float
    median_actual_ttt: float
    std_actual_ttt: float
    min_actual_ttt: float
    max_actual_ttt: float
    best_similarity_pct: float | None = None


class NeighborTttBand(BaseModel):
    mean: float | None = None
    median: float | None = None
    min: float | None = None
    max: float | None = None
    std: float | None = None
    n: int | None = None


class IndustrialObservation(BaseModel):
    observation: str
    severity: str


class DigitalTwinReadiness(BaseModel):
    layers: dict[str, Any]
    overall_score: int
    readiness_tier: str


class PredictionExplainability(BaseModel):
    similar_heats: list[SimilarHeatItem] = Field(default_factory=list)
    neighbor_benchmark: NeighborTttBenchmark | None = None
    contributor_interpretations: list[ContributorItem] = Field(default_factory=list)
    prediction_quality: str = Field(..., description="Excellent | Good | Acceptable | Experimental")
    industrial_observations: list[IndustrialObservation] = Field(default_factory=list)
    digital_twin_readiness: DigitalTwinReadiness | None = None
    historical_similarity_pct: float | None = None
    industrial_risk: str | None = None


class ValidatedRecommendationRow(BaseModel):
    variable: str
    display_name: str | None = None
    current: float
    optimized: float
    difference: float
    pct_change: float
    arrow: str
    reason: str
    physics_status: str
    historical_p5: float | None = None
    historical_median: float | None = None
    historical_p95: float | None = None
    historical_status: str | None = None
    severity: str | None = None
    risk_level: str | None = None
    industrial_acceptability: str | None = None
    absolute_change: float | None = None
    percent_change: float | None = None


class Top5Alternative(BaseModel):
    rank: int
    predicted_ttt: float
    improvement_min: float
    risk_level: str
    confidence: str
    similarity_pct: float
    total_penalty: float
    hm: float
    dri: float
    power: float
    oxy: float


class OptimizationExplainability(BaseModel):
    validated_recommendations: list[ValidatedRecommendationRow] = Field(default_factory=list)
    recommendation_confidence: str
    recommendation_stability: str
    top5_alternatives: list[Top5Alternative] = Field(default_factory=list)
    recommendation_narrative: list[str] = Field(default_factory=list)
    penalty_breakdown: dict[str, float] = Field(default_factory=dict)
    similar_heats: list[SimilarHeatItem] = Field(default_factory=list)
    neighbor_benchmark: NeighborTttBenchmark | None = None
    industrial_observations: list[IndustrialObservation] = Field(default_factory=list)
    digital_twin_readiness: DigitalTwinReadiness | None = None
    diagnostics: dict[str, Any] = Field(default_factory=dict)


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
    ci_half_width: float | None = Field(None, description="Neighbour-informed 95% half-width (minutes)")
    neighbor_calibrated_ttt: float | None = Field(
        None, description="Advisory neighbour-blended TTT — Phase 19 predicted_ttt remains authority"
    )
    neighbor_ttt_band: NeighborTttBand | None = None
    top_contributors: list[ContributorItem] = Field(..., description="Local SHAP-style contributors")
    operator_summary: dict[str, Any] = Field(..., description="Industrial operator summary")
    validation_warnings: list[ValidationWarning] = Field(default_factory=list, description="Advisory warnings — predictions are never blocked")
    confidence: str = Field(..., description="High | Medium | Low | Very Low based on historical operating statistics")
    charge_classification: str = Field(..., description="Normal | Low | High | Very High | Extreme")
    metadata: PredictionMetadata
    explainability: PredictionExplainability | None = None


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
    explainability: OptimizationExplainability | None = None


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


class HybridEvaluateRequest(RecipeInput):
    heat_id: str = Field("", description="Optional heat number for traceability")


class HybridTrustResponse(BaseModel):
    heat_id: str = ""
    current_ttt: float
    predicted_ttt: float
    improvement_min: float
    hybrid_score: float
    score_breakdown: dict[str, float]
    reliability_index: float
    reliability_tier: str
    physics_confidence: float
    ai_confidence: float
    industrial_confidence: float
    historical_similarity_pct: float
    recommendation_stability: float
    agreement_pct: float
    consensus: str
    decision_tree: list[str]
    scenarios: list[dict[str, Any]]
    digital_twin: dict[str, Any]
    recommended_recipe: dict[str, Any]
    top5: list[dict[str, Any]]
    explanation: dict[str, Any]


class OptimizeV2Recommendation(BaseModel):
    rank: int
    recipe: dict[str, Any]
    predicted_ttt: float
    improvement_min: float
    confidence: str
    historical_similarity_pct: float
    stability: float
    rules_satisfied: int
    rules_violated: int
    physics_feasible: bool
    physics_violations: list[str]
    objective_breakdown: dict[str, Any]
    explanation: dict[str, Any]
    industrial_score: float
    physics_score: float


class OptimizeV2Response(BaseModel):
    current_recipe: dict[str, Any]
    current_ttt: float
    optimized_recipe: dict[str, Any]
    optimized_ttt: float
    improvement_min: float
    physics_compliant: bool
    power_optimized: bool = False
    recommendations: list[OptimizeV2Recommendation]
    diagnostics: dict[str, Any]


class ValidationEntryRequest(BaseModel):
    heat_number: str
    predicted_ttt: float
    actual_ttt: float | str | None = None
    optimizer_used: str = "Phase 20.2"
    recommendation_applied: bool | str = False
    operator_comments: str = ""


class ValidationEntryResponse(ValidationEntryRequest):
    recorded_at: str
    difference: float | None = None


class ValidationListResponse(BaseModel):
    entries: list[ValidationEntryResponse]
    metrics: dict[str, Any]


class OperatorFeedbackRequest(BaseModel):
    heat_number: str = ""
    optimizer_used: str = "Phase 20.2"
    status: Literal["Accepted", "Modified", "Rejected"]
    comment: str = ""
    constraint_issue: str = ""
    maintenance_issue: str = ""
    impractical_reason: str = ""


class OperatorFeedbackResponse(OperatorFeedbackRequest):
    recorded_at: str


class FeedbackSummaryResponse(BaseModel):
    total: int
    accepted: int
    modified: int
    rejected: int
    acceptance_rate_pct: float | None


class ReadinessIndicator(BaseModel):
    area: str
    status: Literal["green", "yellow", "red"]
    score: float | None = None
    summary: str
    recommendations: list[str]


class DeploymentReadinessResponse(BaseModel):
    overall_status: Literal["green", "yellow", "red"]
    overall_score: float
    indicators: list[ReadinessIndicator]
    generated_at: str


class ReliabilitySummaryResponse(BaseModel):
    avg_reliability_index: float | None
    avg_ai_confidence: float | None
    avg_physics_confidence: float | None
    avg_industrial_confidence: float | None
    avg_historical_similarity: float | None
    recommendation_acceptance_rate_pct: float | None
    optimizer_success_rate_pct: float | None
    validation_metrics: dict[str, Any]
    prediction_error_trend: list[dict[str, Any]]

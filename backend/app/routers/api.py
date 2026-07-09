"""API route handlers."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.config import DEFAULT_RECIPE
from app.schemas.recipe import (
    DeploymentReadinessResponse,
    FeedbackSummaryResponse,
    HealthResponse,
    HistoricalResponse,
    HistoricalStatisticsResponse,
    HybridEvaluateRequest,
    HybridTrustResponse,
    ModelInfoResponse,
    OperatorFeedbackRequest,
    OperatorFeedbackResponse,
    OptimizeRequest,
    OptimizeResponse,
    OptimizeV2Response,
    PredictRequest,
    PredictionResponse,
    ProcessHealthResponse,
    ReliabilitySummaryResponse,
    ReportRequest,
    ValidationEntryRequest,
    ValidationEntryResponse,
    ValidationListResponse,
    VersionRegistryResponse,
    WhatIfRequest,
    WhatIfResponse,
)
from app.services.phase_33_service import deployment_readiness, reliability_summary
from app.services.research_bridge_service import evaluate_hybrid, optimize_v2
from app.services.validation_store import (
    add_feedback,
    add_validation,
    feedback_summary,
    list_feedback,
    list_validation,
    validation_metrics,
)
from app.services.ml_service import (
    generate_report,
    historical_comparison,
    historical_statistics,
    ml_service,
    optimize_recipe,
    predict_recipe,
    process_health,
    whatif_analysis,
)

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Service health and version registry",
    description=(
        "Returns production readiness for the frozen Phase 19 model, Phase 20.2 optimizer, "
        "historical statistics cache, and deployed version metadata."
    ),
)
async def health() -> HealthResponse:
    return HealthResponse(**ml_service.health())


@router.get(
    "/version",
    response_model=VersionRegistryResponse,
    summary="Version registry",
    description="Single source of truth for frontend, backend, model, optimizer, and research phase versions.",
)
async def version() -> VersionRegistryResponse:
    return VersionRegistryResponse(**ml_service.version_registry())


@router.get(
    "/model-info",
    response_model=ModelInfoResponse,
    summary="Production model metadata",
    description="Frozen Phase 19 ensemble metadata, feature list, and artifact paths.",
)
async def model_info() -> ModelInfoResponse:
    return ModelInfoResponse(**ml_service.model_info())


@router.post(
    "/predict",
    response_model=PredictionResponse,
    summary="Predict tap-to-tap time",
    description=(
        "Predicts tap-to-tap time in minutes for a heat recipe using the frozen Phase 19 production model. "
        "Total charge and operating inputs are advisory only — realistic industrial heats (80–145 t) are accepted "
        "and returned with warnings instead of HTTP validation errors. "
        "Electrical Energy (kWh) is exposed in contributor labels; the request field remains `POWER` for compatibility. "
        "Phase 29 adds optional `explainability` with similar heats, SHAP metallurgical interpretations, "
        "prediction quality, industrial observations, and digital twin readiness — no change to model inference."
    ),
    responses={
        200: {
            "description": "Successful prediction with confidence and advisory warnings",
            "content": {
                "application/json": {
                    "example": {
                        "predicted_ttt": 39.8,
                        "confidence": "Medium",
                        "charge_classification": "High",
                        "validation_warnings": [
                            {
                                "level": "warning",
                                "message": "Total charge is outside historical operating range. Prediction uncertainty may be higher.",
                            }
                        ],
                        "metadata": {
                            "model_version": "2.8.1",
                            "pipeline": "Phase 19",
                            "optimizer": "Phase 20.2",
                            "confidence": "Medium",
                            "warnings": ["Total charge is outside historical operating range."],
                        },
                    }
                }
            },
        }
    },
)
async def predict(req: PredictRequest) -> PredictionResponse:
    data = predict_recipe(req.to_dict())
    return PredictionResponse(**data)


@router.post(
    "/optimize",
    response_model=OptimizeResponse,
    summary="Physics-guided recipe optimization",
    description=(
        "Runs the frozen Phase 20.2 optimizer to recommend recipe adjustments that reduce predicted tap-to-tap time "
        "while respecting plant physics constraints. Recommendations inherit production model semantics including "
        "Electrical Energy (kWh). This endpoint never rejects requests solely because of total charge. "
        "Phase 29 adds optional `explainability` with validated recommendations, severity/risk, top-5 alternatives, "
        "recommendation confidence/stability, and metallurgical narrative — optimizer logic unchanged."
    ),
)
async def optimize(req: OptimizeRequest) -> OptimizeResponse:
    return OptimizeResponse(**optimize_recipe(req.to_dict(), n_generate=req.n_generate))


@router.post(
    "/whatif",
    response_model=WhatIfResponse,
    summary="What-if sensitivity analysis",
    description="Evaluates local TTT sensitivity by perturbing selected recipe variables around the current operating point.",
)
async def whatif(req: WhatIfRequest) -> WhatIfResponse:
    return WhatIfResponse(**whatif_analysis(req.to_dict(), req.variables))


@router.get(
    "/historical",
    response_model=HistoricalResponse,
    summary="Historical comparison (default recipe)",
    description=(
        "Compares the default reference recipe against plant historical P5, median, and P95 bands. "
        "Values outside the band are flagged for operator review — not rejected."
    ),
)
async def historical_get() -> HistoricalResponse:
    return HistoricalResponse(**historical_comparison(dict(DEFAULT_RECIPE)))


@router.post(
    "/historical",
    response_model=HistoricalResponse,
    summary="Historical comparison",
    description=(
        "Compares the submitted recipe against historical operating percentiles. "
        "P5 and P95 represent the 5th and 95th percentile of plant history for each variable."
    ),
)
async def historical(req: PredictRequest) -> HistoricalResponse:
    return HistoricalResponse(**historical_comparison(req.to_dict()))


@router.get(
    "/historical/statistics",
    response_model=HistoricalStatisticsResponse,
    summary="Full historical distribution statistics",
    description=(
        "Returns min, P5, median, P95, max, mean, and standard deviation for every process variable "
        "including derived total charge. Used by the frontend for confidence and validation bands."
    ),
)
async def historical_stats() -> HistoricalStatisticsResponse:
    return HistoricalStatisticsResponse(**historical_statistics())


@router.post(
    "/process-health",
    response_model=ProcessHealthResponse,
    summary="Process health gauges",
    description="Evaluates key process variables against historical operating bands.",
)
async def health_gauges(req: PredictRequest) -> ProcessHealthResponse:
    return ProcessHealthResponse(items=process_health(req.to_dict()))


@router.get("/report")
async def report_get(
    format: Literal["json", "csv", "pdf"] = Query("json", alias="format"),
) -> Response:
    try:
        content = generate_report(dict(DEFAULT_RECIPE), fmt=format, include_opt=True)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    media = {
        "json": "application/json",
        "csv": "text/csv",
        "pdf": "application/pdf",
    }
    filename = f"eaf_report.{format}"
    return Response(
        content=content if isinstance(content, bytes) else content.encode("utf-8"),
        media_type=media[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post(
    "/hybrid/evaluate",
    response_model=HybridTrustResponse,
    summary="Phase 32 hybrid trust evaluation",
    description=(
        "Evaluates the frozen Phase 32 Hybrid Decision Engine for operator trust metrics. "
        "Does not modify production prediction or Phase 20.2 optimizer endpoints."
    ),
)
async def hybrid_evaluate(req: HybridEvaluateRequest) -> HybridTrustResponse:
    try:
        data = evaluate_hybrid(req.to_dict(), heat_id=req.heat_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Hybrid evaluation failed: {exc}") from exc
    return HybridTrustResponse(**data)


@router.post(
    "/optimize/v2",
    response_model=OptimizeV2Response,
    summary="Phase 31 Optimizer V2 (research)",
    description=(
        "Runs the frozen Phase 31 planning-safe optimizer. Never optimizes POWER. "
        "Production `/optimize` (Phase 20.2) remains unchanged."
    ),
)
async def optimize_v2_route(req: PredictRequest) -> OptimizeV2Response:
    try:
        data = optimize_v2(req.to_dict())
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Optimizer V2 failed: {exc}") from exc
    return OptimizeV2Response(**data)


@router.get(
    "/validation",
    response_model=ValidationListResponse,
    summary="Plant validation history",
)
async def validation_list() -> ValidationListResponse:
    entries = []
    for row in list_validation():
        diff = None
        if row.get("actual_ttt") not in (None, "", "Pending"):
            try:
                diff = round(float(row["actual_ttt"]) - float(row["predicted_ttt"]), 3)
            except (TypeError, ValueError):
                pass
        entries.append(ValidationEntryResponse(**row, difference=diff))
    return ValidationListResponse(entries=entries, metrics=validation_metrics())


@router.post(
    "/validation",
    response_model=ValidationEntryResponse,
    summary="Record plant validation result",
)
async def validation_create(req: ValidationEntryRequest) -> ValidationEntryResponse:
    row = add_validation(req.model_dump())
    diff = None
    if row.get("actual_ttt") not in (None, "", "Pending"):
        try:
            diff = round(float(row["actual_ttt"]) - float(row["predicted_ttt"]), 3)
        except (TypeError, ValueError):
            pass
    return ValidationEntryResponse(**row, difference=diff)


@router.get(
    "/feedback",
    response_model=list[OperatorFeedbackResponse],
    summary="Operator feedback history",
)
async def feedback_list() -> list[OperatorFeedbackResponse]:
    return [OperatorFeedbackResponse(**r) for r in list_feedback()]


@router.post(
    "/feedback",
    response_model=OperatorFeedbackResponse,
    summary="Submit operator feedback on a recommendation",
)
async def feedback_create(req: OperatorFeedbackRequest) -> OperatorFeedbackResponse:
    return OperatorFeedbackResponse(**add_feedback(req.model_dump()))


@router.get(
    "/feedback/summary",
    response_model=FeedbackSummaryResponse,
    summary="Operator feedback acceptance summary",
)
async def feedback_summary_route() -> FeedbackSummaryResponse:
    return FeedbackSummaryResponse(**feedback_summary())


@router.get(
    "/reliability/summary",
    response_model=ReliabilitySummaryResponse,
    summary="Reliability dashboard aggregates",
)
async def reliability_summary_route() -> ReliabilitySummaryResponse:
    return ReliabilitySummaryResponse(**reliability_summary())


@router.get(
    "/deployment/readiness",
    response_model=DeploymentReadinessResponse,
    summary="Industrial deployment readiness assessment",
)
async def deployment_readiness_route() -> DeploymentReadinessResponse:
    return DeploymentReadinessResponse(**deployment_readiness())


@router.post("/report")
async def report(req: ReportRequest) -> Response:
    try:
        content = generate_report(req.recipe.to_dict(), fmt=req.format, include_opt=req.include_optimization)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    media = {
        "json": "application/json",
        "csv": "text/csv",
        "pdf": "application/pdf",
    }
    filename = f"eaf_report.{req.format}"
    return Response(
        content=content if isinstance(content, bytes) else content.encode("utf-8"),
        media_type=media[req.format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

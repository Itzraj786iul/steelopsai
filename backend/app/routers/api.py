"""API route handlers."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.config import DEFAULT_RECIPE
from app.schemas.recipe import (
    HealthResponse,
    HistoricalResponse,
    HistoricalStatisticsResponse,
    ModelInfoResponse,
    OptimizeRequest,
    OptimizeResponse,
    PredictRequest,
    PredictionResponse,
    ProcessHealthResponse,
    ReportRequest,
    VersionRegistryResponse,
    WhatIfRequest,
    WhatIfResponse,
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
        "Electrical Energy (kWh) is exposed in contributor labels; the request field remains `POWER` for compatibility."
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
        "Electrical Energy (kWh). This endpoint never rejects requests solely because of total charge."
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

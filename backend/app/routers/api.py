"""API route handlers."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException, Query, Response

from app.core.config import DEFAULT_RECIPE
from app.schemas.recipe import (
    HealthResponse,
    HistoricalResponse,
    ModelInfoResponse,
    OptimizeRequest,
    OptimizeResponse,
    PredictRequest,
    PredictionResponse,
    ProcessHealthResponse,
    ReportRequest,
    WhatIfRequest,
    WhatIfResponse,
)
from app.services.ml_service import (
    generate_report,
    historical_comparison,
    ml_service,
    optimize_recipe,
    predict_recipe,
    process_health,
    whatif_analysis,
)

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(**ml_service.health())


@router.get("/model-info", response_model=ModelInfoResponse)
async def model_info() -> ModelInfoResponse:
    return ModelInfoResponse(**ml_service.model_info())


@router.post("/predict", response_model=PredictionResponse)
async def predict(req: PredictRequest) -> PredictionResponse:
    try:
        data = predict_recipe(req.to_dict())
        contributors = [
            {
                "feature": c.get("feature", ""),
                "display_name": c.get("display_name", c.get("feature", "")),
                "contribution": float(c.get("contribution", 0)),
                "global_importance": float(c.get("global_importance", 0)),
            }
            for c in data["top_contributors"]
        ]
        return PredictionResponse(
            predicted_ttt=data["predicted_ttt"],
            margin=data["margin"],
            ci_lower_95=data["ci_lower_95"],
            ci_upper_95=data["ci_upper_95"],
            top_contributors=contributors,
            operator_summary=data["operator_summary"],
            validation_warnings=data["validation_warnings"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/optimize", response_model=OptimizeResponse)
async def optimize(req: OptimizeRequest) -> OptimizeResponse:
    try:
        return OptimizeResponse(**optimize_recipe(req.to_dict(), n_generate=req.n_generate))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/whatif", response_model=WhatIfResponse)
async def whatif(req: WhatIfRequest) -> WhatIfResponse:
    try:
        return WhatIfResponse(**whatif_analysis(req.to_dict(), req.variables))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.get("/historical", response_model=HistoricalResponse)
async def historical_get() -> HistoricalResponse:
    return HistoricalResponse(**historical_comparison(dict(DEFAULT_RECIPE)))


@router.post("/historical", response_model=HistoricalResponse)
async def historical(req: PredictRequest) -> HistoricalResponse:
    return HistoricalResponse(**historical_comparison(req.to_dict()))


@router.post("/process-health", response_model=ProcessHealthResponse)
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

"""Heat History REST API — production database around frozen ML endpoints."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field

from app.schemas.heat_record import (
    HeatExportRequest,
    HeatListResponse,
    HeatRecordResponse,
    HeatStatusUpdateRequest,
    HeatUpdateOptimizerRequest,
    HeatUpdateValidationRequest,
    HeatUpsertPredictionRequest,
)
from app.services import heat_history_service as svc

router = APIRouter(prefix="/heats", tags=["Heat History"])


@router.post(
    "/from-prediction",
    response_model=HeatRecordResponse,
    summary="Upsert heat after prediction (auto-save)",
)
async def upsert_prediction(req: HeatUpsertPredictionRequest) -> HeatRecordResponse:
    data = svc.upsert_from_prediction(req.model_dump())
    return HeatRecordResponse(**data)


@router.post(
    "/from-optimizer",
    response_model=HeatRecordResponse,
    summary="Update heat after optimization",
)
async def update_optimizer(req: HeatUpdateOptimizerRequest) -> HeatRecordResponse:
    data = svc.update_from_optimizer(req.model_dump())
    if not data:
        raise HTTPException(status_code=404, detail="Heat record not found. Run prediction first.")
    return HeatRecordResponse(**data)


@router.post(
    "/from-validation",
    response_model=HeatRecordResponse,
    summary="Update heat after validation / actual TTT",
)
async def update_validation(req: HeatUpdateValidationRequest) -> HeatRecordResponse:
    data = svc.update_from_validation(req.model_dump())
    if not data:
        raise HTTPException(status_code=404, detail="Heat record not found.")
    return HeatRecordResponse(**data)


@router.get("", response_model=HeatListResponse, summary="List / search / filter heats")
async def list_heats(
    q: str | None = None,
    shift: str | None = None,
    status: str | None = None,
    operator: str | None = None,
    confidence: str | None = None,
    recommendation: str | None = None,
    period: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort_by: str = "created_at",
    sort_dir: str = "desc",
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
) -> HeatListResponse:
    data = svc.list_heats(
        q=q,
        shift=shift,
        status=status,
        operator=operator,
        confidence=confidence,
        recommendation=recommendation,
        period=period,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_dir=sort_dir,
        page=page,
        page_size=page_size,
    )
    return HeatListResponse(
        items=[HeatRecordResponse(**i) for i in data["items"]],
        total=data["total"],
        page=data["page"],
        page_size=data["page_size"],
        pages=data["pages"],
    )


@router.get("/dashboard", summary="Shift / production dashboard aggregates")
async def dashboard(
    period: str | None = "today",
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    return svc.shift_dashboard(period=period, date_from=date_from, date_to=date_to)


@router.get("/analytics", summary="Plant analytics from HeatRecord database")
async def analytics(
    period: str | None = "month",
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict:
    return svc.plant_analytics(period=period, date_from=date_from, date_to=date_to)


@router.get("/reports/daily", summary="Daily production report")
async def report_daily(day: str | None = None) -> dict:
    return svc.day_report(day)


@router.get("/reports/weekly", summary="Weekly production report")
async def report_weekly(anchor: str | None = None) -> dict:
    return svc.week_report(anchor)


@router.get("/reports/monthly", summary="Monthly production report")
async def report_monthly(anchor: str | None = None) -> dict:
    return svc.month_report(anchor)


@router.get("/validation-metrics", summary="MAE/RMSE/Bias from all validated heats")
async def validation_metrics() -> dict:
    return svc.validation_metrics_from_db()


@router.post("/export", summary="Export heats as CSV / Excel / JSON / PDF")
async def export_heats(req: HeatExportRequest) -> Response:
    try:
        content, media, filename = svc.export_heats(
            fmt=req.format,
            ids=req.ids,
            q=req.q,
            shift=req.shift,
            status=req.status,
            period=req.period,
            date_from=req.date_from,
            date_to=req.date_to,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/by-number/{heat_number}", response_model=HeatRecordResponse)
async def get_by_number(heat_number: str) -> HeatRecordResponse:
    data = svc.get_heat_by_number(heat_number)
    if not data:
        raise HTTPException(status_code=404, detail="Heat not found")
    return HeatRecordResponse(**data)


class BulkDeleteBody(BaseModel):
    ids: list[str] = Field(default_factory=list, min_length=1)


@router.post("/bulk-delete", summary="Permanently delete multiple heat records")
async def bulk_delete(body: BulkDeleteBody) -> dict[str, Any]:
    deleted = svc.delete_heats(body.ids)
    return {"deleted": deleted, "requested": len(body.ids)}


@router.get("/{heat_id}", response_model=HeatRecordResponse)
async def get_heat(heat_id: str) -> HeatRecordResponse:
    data = svc.get_heat(heat_id)
    if not data:
        raise HTTPException(status_code=404, detail="Heat not found")
    return HeatRecordResponse(**data)


@router.patch("/{heat_id}/status", response_model=HeatRecordResponse)
async def patch_status(heat_id: str, req: HeatStatusUpdateRequest) -> HeatRecordResponse:
    try:
        data = svc.set_status(heat_id, req.status)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if not data:
        raise HTTPException(status_code=404, detail="Heat not found")
    return HeatRecordResponse(**data)


@router.post("/{heat_id}/archive", response_model=HeatRecordResponse)
async def archive(heat_id: str) -> HeatRecordResponse:
    data = svc.archive_heat(heat_id)
    if not data:
        raise HTTPException(status_code=404, detail="Heat not found")
    return HeatRecordResponse(**data)


@router.delete("/{heat_id}", summary="Permanently delete a heat record")
async def delete_heat(heat_id: str) -> dict[str, Any]:
    ok = svc.delete_heat(heat_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Heat not found")
    return {"deleted": True, "id": heat_id}

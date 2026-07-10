"""MES production planning & execution REST API."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from app.services import mes_service as mes
from app.services.enterprise_deps import CurrentUser, require_permissions

router = APIRouter(prefix="/mes", tags=["MES Production Planning"])


class PlanBody(BaseModel):
    production_date: str
    shift_code: str = "A"
    furnace_id: str = "EAF-1"
    target_grade: str = ""
    target_heat_count: int = 0
    target_tonnage: float = 0
    target_ttt: float | None = None
    target_productivity: float | None = None
    target_electrical_energy: float | None = None
    priority: str = "Normal"
    status: str = "Draft"
    notes: str = ""


class PlanUpdateBody(BaseModel):
    production_date: str | None = None
    shift_code: str | None = None
    furnace_id: str | None = None
    target_grade: str | None = None
    target_heat_count: int | None = None
    target_tonnage: float | None = None
    target_ttt: float | None = None
    target_productivity: float | None = None
    target_electrical_energy: float | None = None
    priority: str | None = None
    status: str | None = None
    notes: str | None = None


class PlannedHeatBody(BaseModel):
    heat_number: str
    plan_id: str | None = None
    target_grade: str = ""
    target_charge: float | None = None
    expected_start: str | None = None
    expected_end: str | None = None
    assigned_operator_id: str | None = None
    assigned_shift: str = "A"
    assigned_furnace: str = "EAF-1"
    priority: str = "Normal"
    status: str = "Planned"
    recipe: dict[str, Any] | None = None
    notes: str = ""


class PlannedHeatUpdateBody(BaseModel):
    plan_id: str | None = None
    target_grade: str | None = None
    target_charge: float | None = None
    expected_start: str | None = None
    expected_end: str | None = None
    assigned_operator_id: str | None = None
    assigned_shift: str | None = None
    assigned_furnace: str | None = None
    priority: str | None = None
    status: str | None = None
    recipe: dict[str, Any] | None = None
    notes: str | None = None
    session_id: str | None = None
    heat_record_id: str | None = None


class StatusBody(BaseModel):
    status: str


class AiEventBody(BaseModel):
    heat_number: str
    event: Literal[
        "heat_start",
        "prediction",
        "optimization",
        "recommendation_accepted",
        "charging",
        "running",
        "tap",
        "validation",
        "completed",
        "archive",
        "delayed",
        "cancelled",
    ]
    session_id: str | None = None
    heat_record_id: str | None = None
    recipe: dict[str, Any] | None = None


# Plans
@router.get("/plans")
async def plans_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.production", "mes.view"))],
    date_from: str | None = None,
    date_to: str | None = None,
    status: str | None = None,
    furnace_id: str | None = None,
) -> list[dict[str, Any]]:
    return mes.list_plans(date_from=date_from, date_to=date_to, status=status, furnace_id=furnace_id)


@router.post("/plans", status_code=201)
async def plans_create(
    body: PlanBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.production", "mes.manage"))],
) -> dict[str, Any]:
    return mes.create_plan(body.model_dump(), user)


@router.get("/plans/{plan_id}")
async def plans_get(
    plan_id: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.production"))],
) -> dict[str, Any]:
    row = mes.get_plan(plan_id)
    if not row:
        raise HTTPException(404, "Plan not found")
    return row


@router.patch("/plans/{plan_id}")
async def plans_update(
    plan_id: str,
    body: PlanUpdateBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "mes.manage", "dashboard.production"))],
) -> dict[str, Any]:
    row = mes.update_plan(plan_id, body.model_dump(exclude_unset=True), user)
    if not row:
        raise HTTPException(404, "Plan not found")
    return row


# Scheduler
@router.get("/heats")
async def heats_list(
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.operator"))],
    status: str | None = None,
    furnace_id: str | None = None,
    shift: str | None = None,
    operator_id: str | None = None,
    plan_id: str | None = None,
    date: str | None = None,
    q: str | None = None,
    mine: bool = False,
) -> list[dict[str, Any]]:
    oid = user["id"] if mine else operator_id
    return mes.list_planned_heats(
        status=status,
        furnace_id=furnace_id,
        shift=shift,
        operator_id=oid,
        plan_id=plan_id,
        date=date,
        q=q,
    )


@router.post("/heats", status_code=201)
async def heats_create(
    body: PlannedHeatBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "mes.manage", "dashboard.production"))],
) -> dict[str, Any]:
    try:
        return mes.create_planned_heat(body.model_dump(), user)
    except Exception as exc:
        raise HTTPException(422, str(exc)) from exc


@router.get("/heats/by-number/{heat_number}")
async def heats_by_number(
    heat_number: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "heat.create"))],
) -> dict[str, Any]:
    row = mes.get_planned_heat(heat_number=heat_number)
    if not row:
        raise HTTPException(404, "Planned heat not found")
    return row


@router.get("/heats/{heat_id}")
async def heats_get(
    heat_id: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "heat.create"))],
) -> dict[str, Any]:
    row = mes.get_planned_heat(heat_id=heat_id)
    if not row:
        raise HTTPException(404, "Planned heat not found")
    return row


@router.patch("/heats/{heat_id}")
async def heats_update(
    heat_id: str,
    body: PlannedHeatUpdateBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "mes.manage", "heat.create"))],
) -> dict[str, Any]:
    row = mes.update_planned_heat(heat_id, body.model_dump(exclude_unset=True), user)
    if not row:
        raise HTTPException(404, "Planned heat not found")
    return row


@router.post("/heats/{heat_id}/status")
async def heats_status(
    heat_id: str,
    body: StatusBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "mes.manage", "heat.create"))],
) -> dict[str, Any]:
    row = mes.set_heat_status(heat_id, body.status, user)
    if not row:
        raise HTTPException(404, "Planned heat not found")
    return row


@router.post("/events/ai")
async def ai_event(
    body: AiEventBody,
    _user: Annotated[dict[str, Any], Depends(require_permissions("heat.create", "heat.optimize", "heat.validate", "mes.view"))],
) -> dict[str, Any]:
    row = mes.apply_ai_event(
        body.heat_number,
        body.event,
        session_id=body.session_id,
        heat_record_id=body.heat_record_id,
        recipe=body.recipe,
    )
    if not row:
        return {"ok": False, "detail": "No planned heat for this heat_number"}
    return {"ok": True, "heat": row}


@router.get("/heats/{heat_id}/timeline")
async def heats_timeline(
    heat_id: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view"))],
) -> dict[str, Any]:
    ph = mes.get_planned_heat(heat_id=heat_id)
    if not ph:
        raise HTTPException(404, "Planned heat not found")
    return mes.heat_timeline(ph["heat_number"])


# Boards & KPIs
@router.get("/live-board")
async def live_board(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.production"))],
    furnace_id: str | None = None,
    shift: str | None = None,
) -> dict[str, Any]:
    return mes.live_board(furnace_id=furnace_id, shift=shift)


@router.get("/kpi-wall")
async def kpi_wall(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.plant"))],
    furnace_id: str | None = None,
) -> dict[str, Any]:
    return mes.kpi_wall(furnace_id=furnace_id)


@router.get("/targets")
async def targets(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.production"))],
    plan_id: str | None = None,
    date: str | None = None,
) -> dict[str, Any]:
    return mes.production_targets(plan_id=plan_id, date=date)


@router.get("/shift-scorecard")
async def shift_scorecard(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.shift", "mes.view"))],
    shift: str = "A",
    date: str | None = None,
) -> dict[str, Any]:
    return mes.shift_scorecard(shift, date)


@router.get("/furnace-utilization")
async def furnace_util(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.plant"))],
    period: str = "daily",
    furnace_id: str = "EAF-1",
) -> dict[str, Any]:
    return mes.furnace_utilization(period, furnace_id)


@router.get("/delay-dashboard")
async def delay_dash(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "delay.manage", "mes.view"))],
) -> dict[str, Any]:
    return mes.delay_dashboard()


@router.get("/boards/operator")
async def board_operator(
    user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.operator", "mes.view", "ops.view"))],
    operator_id: str | None = None,
) -> dict[str, Any]:
    oid = operator_id or user["id"]
    if user.get("role") == "operator" and oid != user["id"]:
        raise HTTPException(403, "Operators can only view their own board")
    return mes.operator_board(oid)


@router.get("/boards/supervisor")
async def board_supervisor(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.shift", "mes.view", "ops.view"))],
    shift: str = "A",
    date: str | None = None,
) -> dict[str, Any]:
    return mes.supervisor_board(shift, date)


@router.get("/boards/plant-manager")
async def board_plant(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.plant", "dashboard.production", "mes.view"))],
) -> dict[str, Any]:
    return mes.plant_manager_board()


@router.get("/analytics/planning")
async def analytics_planning(
    _user: Annotated[dict[str, Any], Depends(require_permissions("analytics.advanced", "mes.view", "reports.view"))],
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    return mes.planning_analytics(date_from=date_from, date_to=date_to)


@router.get("/dashboard-widgets")
async def dash_widgets(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "mes.view", "dashboard.operator"))],
) -> dict[str, Any]:
    return mes.dashboard_widgets()


@router.get("/search")
async def search(
    _user: CurrentUser,
    q: str = Query(..., min_length=1),
    limit: int = Query(30, ge=1, le=50),
) -> dict[str, list[dict[str, Any]]]:
    return mes.mes_search(q, limit=limit)


@router.get("/reports/{kind}")
async def reports(
    kind: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("reports.view", "mes.view"))],
    date: str | None = None,
    shift: str | None = None,
    operator_id: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    return mes.mes_report(kind, date=date, shift=shift, operator_id=operator_id, date_from=date_from, date_to=date_to)


@router.get("/export/{kind}")
async def export(
    kind: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("reports.export", "reports.view", "mes.view"))],
    fmt: Literal["csv", "excel", "json", "pdf"] = "json",
    date: str | None = None,
    shift: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> Response:
    content, media, filename = mes.export_mes(
        kind, fmt=fmt, date=date, shift=shift, date_from=date_from, date_to=date_to
    )
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

"""Production operations REST API."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.services import ops_service as ops
from app.services.enterprise_deps import CurrentUser, require_permissions

router = APIRouter(prefix="/ops", tags=["Production Operations"])


class FurnaceBody(BaseModel):
    code: str
    name: str
    plant: str = "JSPL"
    type: str = "EAF"


class ShiftBody(BaseModel):
    code: str
    name: str | None = None
    start_time: str
    end_time: str
    supervisor_id: str | None = None
    status: str = "Upcoming"
    date: str | None = None
    assignments: list[dict[str, str]] | None = None


class ShiftUpdateBody(BaseModel):
    name: str | None = None
    start_time: str | None = None
    end_time: str | None = None
    supervisor_id: str | None = None
    status: str | None = None
    date: str | None = None
    is_archived: bool | None = None
    assignments: list[dict[str, str]] | None = None
    code: str | None = None


class AssignBody(BaseModel):
    user_id: str
    role_in_shift: str = "operator"


class QueueBody(BaseModel):
    heat_number: str
    furnace_id: str | None = "EAF-1"
    shift_id: str | None = None
    operator_id: str | None = None
    supervisor_id: str | None = None
    plant: str = "JSPL"
    status: str = "Upcoming"
    notes: str = ""
    heat_record_id: str | None = None


class QueueUpdateBody(BaseModel):
    status: str | None = None
    furnace_id: str | None = None
    shift_id: str | None = None
    operator_id: str | None = None
    supervisor_id: str | None = None
    notes: str | None = None
    sort_order: int | None = None


class ReorderBody(BaseModel):
    ordered_ids: list[str]


class HandoverBody(BaseModel):
    shift_id: str
    incoming_user_id: str | None = None
    production_summary: str = ""
    problems: str = ""
    delay_reasons: str = ""
    equipment_observations: str = ""
    pending_heats: str = ""
    pending_validation: str = ""
    recommendations: str = ""
    outgoing_signature: str = ""


class AckHandoverBody(BaseModel):
    signature: str = ""


class ApprovalStartBody(BaseModel):
    heat_number: str
    heat_record_id: str | None = None
    comments: str = ""


class ApprovalActionBody(BaseModel):
    action: Literal["submit", "approve_shift", "approve_pm", "execute", "validate", "reject"]
    comments: str = ""


class TaskBody(BaseModel):
    title: str
    description: str = ""
    assignee_id: str | None = None
    heat_number: str | None = None
    priority: str = "Medium"
    due_at: str | None = None


class TaskUpdateBody(BaseModel):
    title: str | None = None
    description: str | None = None
    assignee_id: str | None = None
    priority: str | None = None
    status: str | None = None
    due_at: str | None = None
    heat_number: str | None = None


class AnnouncementBody(BaseModel):
    title: str
    body: str
    category: str = "Production"
    audience_role: str | None = None
    expires_at: str | None = None


class CalendarBody(BaseModel):
    title: str
    event_type: str = "Production"
    start_at: str
    end_at: str | None = None
    shift_id: str | None = None
    furnace_id: str | None = None
    notes: str = ""


# Furnaces
@router.get("/furnaces")
async def furnaces_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("heat.view_all", "heat.view_shift", "ops.view"))],
) -> list[dict[str, Any]]:
    return ops.list_furnaces()


@router.post("/furnaces", status_code=201)
async def furnaces_create(
    body: FurnaceBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("plant.configure", "users.manage"))],
) -> dict[str, Any]:
    return ops.create_furnace(body.model_dump(), user)


# Shifts
@router.get("/shifts")
async def shifts_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "heat.view_all", "dashboard.shift"))],
    include_archived: bool = False,
) -> list[dict[str, Any]]:
    return ops.list_shifts(include_archived=include_archived)


@router.post("/shifts", status_code=201)
async def shifts_create(
    body: ShiftBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "users.manage"))],
) -> dict[str, Any]:
    return ops.create_shift(body.model_dump(), user)


@router.get("/shifts/{shift_id}")
async def shifts_get(
    shift_id: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.shift"))],
) -> dict[str, Any]:
    row = ops.get_shift(shift_id)
    if not row:
        raise HTTPException(404, "Shift not found")
    return row


@router.patch("/shifts/{shift_id}")
async def shifts_update(
    shift_id: str,
    body: ShiftUpdateBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "users.manage"))],
) -> dict[str, Any]:
    row = ops.update_shift(shift_id, body.model_dump(exclude_unset=True), user)
    if not row:
        raise HTTPException(404, "Shift not found")
    return row


@router.post("/shifts/{shift_id}/assign")
async def shifts_assign(
    shift_id: str,
    body: AssignBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "users.manage", "dashboard.production"))],
) -> dict[str, Any]:
    row = ops.assign_user_to_shift(shift_id, body.user_id, body.role_in_shift, user)
    if not row:
        raise HTTPException(404, "Shift not found")
    return row


# Queue
@router.get("/queue")
async def queue_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "heat.view_all", "dashboard.production"))],
    status: str | None = None,
    furnace_id: str | None = None,
) -> list[dict[str, Any]]:
    return ops.list_queue(status=status, furnace_id=furnace_id)


@router.post("/queue", status_code=201)
async def queue_create(
    body: QueueBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "heat.create", "dashboard.production"))],
) -> dict[str, Any]:
    return ops.create_queue_item(body.model_dump(), user)


@router.patch("/queue/{qid}")
async def queue_update(
    qid: str,
    body: QueueUpdateBody,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.production"))],
) -> dict[str, Any]:
    row = ops.update_queue_item(qid, body.model_dump(exclude_unset=True))
    if not row:
        raise HTTPException(404, "Queue item not found")
    return row


@router.post("/queue/reorder")
async def queue_reorder(
    body: ReorderBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.production"))],
) -> list[dict[str, Any]]:
    return ops.reorder_queue(body.ordered_ids, user)


# Handover
@router.get("/handovers")
async def handovers_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.shift"))],
) -> list[dict[str, Any]]:
    return ops.list_handovers()


@router.post("/handovers", status_code=201)
async def handovers_create(
    body: HandoverBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.shift"))],
) -> dict[str, Any]:
    return ops.create_handover(body.model_dump(), user)


@router.post("/handovers/{hid}/acknowledge")
async def handovers_ack(
    hid: str,
    body: AckHandoverBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.shift"))],
) -> dict[str, Any]:
    row = ops.acknowledge_handover(hid, body.signature, user)
    if not row:
        raise HTTPException(404, "Handover not found")
    return row


# Approvals
@router.get("/approvals")
async def approvals_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("heat.accept", "dashboard.production"))],
    status: str | None = None,
) -> list[dict[str, Any]]:
    return ops.list_approvals(status=status)


@router.post("/approvals", status_code=201)
async def approvals_start(
    body: ApprovalStartBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("heat.accept", "heat.create"))],
) -> dict[str, Any]:
    return ops.start_approval(body.model_dump(), user)


@router.post("/approvals/{aid}/action")
async def approvals_action(
    aid: str,
    body: ApprovalActionBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("heat.accept", "dashboard.production"))],
) -> dict[str, Any]:
    try:
        row = ops.advance_approval(aid, body.action, user, body.comments)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    if not row:
        raise HTTPException(404, "Approval not found")
    return row


# Tasks
@router.get("/tasks")
async def tasks_list(
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.operator", "tasks.view"))],
    mine: bool = False,
    status: str | None = None,
) -> list[dict[str, Any]]:
    assignee = user["id"] if mine else None
    return ops.list_tasks(assignee_id=assignee, status=status)


@router.post("/tasks", status_code=201)
async def tasks_create(
    body: TaskBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "dashboard.production", "tasks.manage"))],
) -> dict[str, Any]:
    return ops.create_task(body.model_dump(), user)


@router.patch("/tasks/{tid}")
async def tasks_update(
    tid: str,
    body: TaskUpdateBody,
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "tasks.view", "dashboard.operator"))],
) -> dict[str, Any]:
    row = ops.update_task(tid, body.model_dump(exclude_unset=True))
    if not row:
        raise HTTPException(404, "Task not found")
    return row


# Announcements
@router.get("/announcements")
async def announcements_list(user: CurrentUser) -> list[dict[str, Any]]:
    return ops.list_announcements(role=user.get("role"))


@router.post("/announcements", status_code=201)
async def announcements_create(
    body: AnnouncementBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("users.manage", "ops.manage"))],
) -> dict[str, Any]:
    return ops.create_announcement(body.model_dump(), user)


# Calendar
@router.get("/calendar")
async def calendar_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("ops.view", "dashboard.plant", "reports.view"))],
    date_from: str | None = None,
    date_to: str | None = None,
) -> list[dict[str, Any]]:
    return ops.list_calendar(date_from=date_from, date_to=date_to)


@router.post("/calendar", status_code=201)
async def calendar_create(
    body: CalendarBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("ops.manage", "plant.configure"))],
) -> dict[str, Any]:
    return ops.create_calendar_event(body.model_dump(), user)


# Search
@router.get("/search")
async def search(
    _user: CurrentUser,
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict[str, list[dict[str, Any]]]:
    return ops.enterprise_search(q, limit=limit)


# Dashboards
@router.get("/dashboards/operator-performance")
async def dash_operator_perf(
    user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.operator", "dashboard.shift", "dashboard.production"))],
    user_id: str | None = None,
) -> dict[str, Any]:
    target = user_id or user["id"]
    # Operators may only view self unless manager
    if user.get("role") == "operator" and target != user["id"]:
        raise HTTPException(403, "Operators can only view their own performance")
    return ops.operator_performance(target)


@router.get("/dashboards/production-manager")
async def dash_pm(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.production", "dashboard.plant"))],
) -> dict[str, Any]:
    return ops.production_manager_dashboard()


@router.get("/dashboards/shift-performance")
async def dash_shift_perf(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.shift", "dashboard.production"))],
    shift: str | None = None,
) -> dict[str, Any]:
    return ops.shift_performance(shift)


@router.get("/dashboards/analytics")
async def dash_analytics(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.production", "dashboard.plant", "analytics.advanced"))],
) -> dict[str, Any]:
    return ops.ops_analytics()


@router.get("/reports/{kind}")
async def ops_reports(
    kind: str,
    _user: Annotated[dict[str, Any], Depends(require_permissions("reports.view", "dashboard.production"))],
) -> dict[str, Any]:
    return ops.ops_report(kind)


@router.post("/alerts/generate")
async def alerts_generate(
    _user: Annotated[dict[str, Any], Depends(require_permissions("alerts.manage", "dashboard.production"))],
) -> list[dict[str, Any]]:
    return ops.generate_ops_alerts()

"""Enterprise Auth & Admin REST API."""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.services import enterprise_auth as auth
from app.services import enterprise_service as svc
from app.services.enterprise_deps import CurrentUser, require_permissions
from app.services.enterprise_rbac import PERMISSIONS, ROLES

router = APIRouter(tags=["Enterprise Auth"])


class LoginBody(BaseModel):
    email: str
    password: str


class RefreshBody(BaseModel):
    refresh_token: str


class CreateUserBody(BaseModel):
    email: str
    password: str = Field(min_length=6)
    full_name: str
    role: str = "operator"
    department_id: str | None = None
    shift: Literal["A", "B", "C"] | None = None


class UpdateUserBody(BaseModel):
    full_name: str | None = None
    role: str | None = None
    department_id: str | None = None
    shift: Literal["A", "B", "C"] | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=6)


class ResetPasswordBody(BaseModel):
    password: str = Field(min_length=6)


class DelayBody(BaseModel):
    heat_number: str | None = None
    category: str
    start_time: str
    end_time: str | None = None
    duration_min: float | None = None
    department: str | None = None
    root_cause: str | None = None
    corrective_action: str | None = None
    shift: str | None = None


def _meta(request: Request) -> tuple[str, str]:
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    return ip, ua


@router.post("/auth/login", summary="Enterprise login")
async def login(body: LoginBody, request: Request) -> dict[str, Any]:
    ip, ua = _meta(request)
    try:
        return auth.authenticate(body.email, body.password, ip=ip, ua=ua)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/auth/refresh", summary="Refresh access token")
async def refresh(body: RefreshBody) -> dict[str, Any]:
    try:
        return auth.refresh_session(body.refresh_token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(exc)) from exc


@router.post("/auth/logout", summary="Logout / revoke refresh token")
async def logout(body: RefreshBody, user: CurrentUser) -> dict[str, str]:
    auth.revoke_refresh(body.refresh_token)
    auth.write_audit(user_id=user["id"], user_email=user["email"], action="logout", resource="auth")
    return {"status": "ok"}


@router.get("/auth/me", summary="Current user profile + permissions")
async def me(user: CurrentUser) -> dict[str, Any]:
    return user


@router.get("/auth/roles", summary="List roles")
async def list_roles(_user: CurrentUser) -> list[dict[str, str]]:
    return [{"code": c, "name": n, "description": d} for c, n, d in ROLES]


@router.get("/auth/permissions", summary="List permission catalog")
async def list_permissions(
    _user: Annotated[dict[str, Any], Depends(require_permissions("roles.manage", "users.manage"))],
) -> list[dict[str, str]]:
    return [{"code": c, "name": n, "category": cat} for c, n, cat in PERMISSIONS]


@router.get("/admin/users", summary="List users")
async def admin_list_users(
    _user: Annotated[dict[str, Any], Depends(require_permissions("users.view", "users.manage"))],
    q: str | None = None,
    role: str | None = None,
) -> list[dict[str, Any]]:
    return svc.list_users(q=q, role=role)


@router.post("/admin/users", summary="Create user", status_code=201)
async def admin_create_user(
    body: CreateUserBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("users.manage"))],
) -> dict[str, Any]:
    try:
        return svc.create_user(body.model_dump(), user)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.patch("/admin/users/{user_id}", summary="Update user")
async def admin_update_user(
    user_id: str,
    body: UpdateUserBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("users.manage"))],
) -> dict[str, Any]:
    try:
        return svc.update_user(user_id, body.model_dump(exclude_unset=True), user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/admin/users/{user_id}/reset-password", summary="Reset password")
async def admin_reset_password(
    user_id: str,
    body: ResetPasswordBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("users.manage"))],
) -> dict[str, str]:
    try:
        svc.reset_password(user_id, body.password, user)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"status": "ok"}


@router.post("/admin/users/{user_id}/force-logout", summary="Force logout")
async def admin_force_logout(
    user_id: str,
    user: Annotated[dict[str, Any], Depends(require_permissions("users.manage"))],
) -> dict[str, str]:
    svc.force_logout(user_id, user)
    return {"status": "ok"}


@router.get("/admin/dashboard", summary="Admin system dashboard")
async def admin_dash(
    _user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.admin", "system.health"))],
) -> dict[str, Any]:
    return svc.admin_dashboard()


@router.get("/admin/audit", summary="Audit log")
async def admin_audit(
    _user: Annotated[dict[str, Any], Depends(require_permissions("audit.view"))],
    q: str | None = None,
    limit: int = Query(100, ge=1, le=500),
) -> list[dict[str, Any]]:
    return svc.list_audit(limit=limit, q=q)


@router.get("/admin/login-history", summary="Login history")
async def admin_login_history(
    _user: Annotated[dict[str, Any], Depends(require_permissions("audit.view", "users.manage"))],
    limit: int = Query(50, ge=1, le=200),
) -> list[dict[str, Any]]:
    return svc.list_login_history(limit=limit)


@router.get("/dashboards/operator", summary="Operator dashboard")
async def dash_operator(
    user: Annotated[dict[str, Any], Depends(require_permissions("dashboard.operator", "dashboard.shift"))],
) -> dict[str, Any]:
    return svc.operator_dashboard(user)


@router.get("/delays", summary="List delay events")
async def delays_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("maintenance.view", "delay.manage"))],
) -> list[dict[str, Any]]:
    return svc.list_delays()


@router.post("/delays", summary="Create delay event", status_code=201)
async def delays_create(
    body: DelayBody,
    user: Annotated[dict[str, Any], Depends(require_permissions("delay.manage"))],
) -> dict[str, Any]:
    return svc.create_delay(body.model_dump(), user)


@router.get("/alerts", summary="Alert center")
async def alerts_list(
    _user: Annotated[dict[str, Any], Depends(require_permissions("alerts.view"))],
    acknowledged: bool | None = None,
) -> list[dict[str, Any]]:
    return svc.list_alerts(acknowledged=acknowledged)


@router.post("/alerts/{alert_id}/acknowledge", summary="Acknowledge alert")
async def alerts_ack(
    alert_id: str,
    user: Annotated[dict[str, Any], Depends(require_permissions("alerts.manage", "alerts.view"))],
) -> dict[str, Any]:
    row = svc.acknowledge_alert(alert_id, user)
    if not row:
        raise HTTPException(status_code=404, detail="Alert not found")
    return row


@router.get("/notifications", summary="Notification center")
async def notifications_list(
    user: Annotated[dict[str, Any], Depends(require_permissions("notifications.view"))],
) -> list[dict[str, Any]]:
    return svc.list_notifications(user)


@router.post("/notifications/{notif_id}/read", summary="Mark notification read")
async def notifications_read(
    notif_id: str,
    user: Annotated[dict[str, Any], Depends(require_permissions("notifications.view"))],
) -> dict[str, str]:
    svc.mark_notification_read(notif_id, user)
    return {"status": "ok"}

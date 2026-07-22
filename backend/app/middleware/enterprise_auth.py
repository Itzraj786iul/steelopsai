"""HTTP middleware enforcing JWT + permission map on protected routes.

Public paths remain open (health, docs, auth login). ML routes require
heat.* permissions when EAF_REQUIRE_AUTH=1 (default on).
Set EAF_REQUIRE_AUTH=0 only for local ML regression scripts.
"""

from __future__ import annotations

import os
import re
import time
from typing import Callable

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.services import enterprise_auth as auth

REQUIRE_AUTH = os.environ.get("EAF_REQUIRE_AUTH", "1").strip() not in {"0", "false", "False", "no"}

# Short-lived cache so every /predict does not re-hit SQLite for the same JWT subject.
_AUTH_CACHE_TTL_S = float(os.environ.get("EAF_AUTH_CACHE_TTL", "45"))
_auth_public_cache: dict[str, tuple[float, dict]] = {}


def _cached_user_public(user_id: str) -> dict | None:
    hit = _auth_public_cache.get(user_id)
    if not hit:
        return None
    expires_at, public = hit
    if time.monotonic() > expires_at:
        _auth_public_cache.pop(user_id, None)
        return None
    return public


def _store_user_public(user_id: str, public: dict) -> None:
    _auth_public_cache[user_id] = (time.monotonic() + _AUTH_CACHE_TTL_S, public)
    # Soft bound cache size
    if len(_auth_public_cache) > 500:
        oldest = min(_auth_public_cache.items(), key=lambda kv: kv[1][0])[0]
        _auth_public_cache.pop(oldest, None)

PUBLIC_EXACT = {
    "/",
    "/health",
    "/version",
    "/ml/warm",
    "/auth/login",
    "/auth/refresh",
    "/docs",
    "/redoc",
    "/openapi.json",
}

# method + path pattern → required permission codes (any match)
ROUTE_PERMS: list[tuple[str, str, list[str]]] = [
    ("POST", r"^/predict$", ["heat.create"]),
    ("POST", r"^/optimize$", ["heat.optimize"]),
    ("POST", r"^/optimize/v2$", ["research.view", "heat.optimize"]),
    ("POST", r"^/whatif$", ["heat.whatif"]),
    ("POST", r"^/hybrid/evaluate$", ["research.view", "heat.create"]),
    ("POST", r"^/validation$", ["heat.validate"]),
    ("GET", r"^/validation$", ["heat.validate", "quality.view", "heat.view_all"]),
    ("POST", r"^/report$", ["reports.export", "reports.view"]),
    ("GET", r"^/report$", ["reports.view"]),
    ("GET", r"^/heats", ["heat.view_all", "heat.view_shift", "reports.view"]),
    ("POST", r"^/heats", ["heat.create", "heat.optimize", "heat.validate", "reports.export"]),
    ("PATCH", r"^/heats", ["heat.validate", "users.manage"]),
    ("DELETE", r"^/heats", ["heat.create", "heat.view_all", "users.manage"]),
    ("GET", r"^/model-info$", ["research.view", "system.health", "heat.create"]),
    ("GET", r"^/historical", ["heat.view_all", "heat.create", "analytics.advanced"]),
    ("POST", r"^/historical", ["heat.create", "analytics.advanced"]),
    ("POST", r"^/process-health$", ["heat.create", "maintenance.view"]),
    ("GET", r"^/reliability", ["research.view", "quality.view"]),
    ("GET", r"^/deployment", ["enterprise.view", "deployment.approve"]),
    ("GET", r"^/feedback", ["heat.accept", "quality.view"]),
    ("POST", r"^/feedback", ["heat.accept"]),
    ("GET", r"^/ops/", ["ops.view", "ops.manage", "dashboard.operator", "dashboard.production", "dashboard.shift"]),
    ("POST", r"^/ops/", ["ops.manage", "ops.view", "heat.accept", "tasks.manage", "dashboard.production"]),
    ("PATCH", r"^/ops/", ["ops.manage", "ops.view", "tasks.view", "dashboard.operator"]),
    ("GET", r"^/mes/", ["mes.view", "mes.manage", "ops.view", "dashboard.operator", "dashboard.production", "dashboard.plant"]),
    ("POST", r"^/mes/", ["mes.manage", "mes.view", "ops.manage", "heat.create", "heat.optimize", "heat.validate"]),
    ("PATCH", r"^/mes/", ["mes.manage", "mes.view", "ops.manage", "heat.create"]),
]


class EnterpriseAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        path = request.url.path
        method = request.method.upper()

        if method == "OPTIONS":
            return await call_next(request)

        if path in PUBLIC_EXACT or path.startswith("/docs") or path.startswith("/redoc"):
            return await call_next(request)

        # Enterprise router uses FastAPI Depends — still validate token here when required
        if not REQUIRE_AUTH:
            return await call_next(request)

        # Auth routes that need a user are handled by Depends; login/refresh already public
        if path.startswith("/auth/") and path not in {"/auth/login", "/auth/refresh"}:
            # Let Depends handle detail; still require bearer presence
            pass

        auth_header = request.headers.get("authorization") or ""
        token = ""
        if auth_header.lower().startswith("bearer "):
            token = auth_header.split(" ", 1)[1].strip()

        if not token:
            # Enterprise admin routes always need auth
            if path.startswith(("/admin", "/delays", "/alerts", "/notifications", "/dashboards", "/ops", "/mes")):
                return JSONResponse({"detail": "Not authenticated"}, status_code=401)
            # ML + heats
            return JSONResponse({"detail": "Not authenticated"}, status_code=401)

        try:
            payload = auth.decode_access_token(token)
            user_id = payload["sub"]
            public = _cached_user_public(user_id)
            if public is None:
                user = auth.get_user_by_id(user_id)
                if not user:
                    return JSONResponse(
                        {"detail": "Session expired — please sign in again"},
                        status_code=401,
                    )
                if not user["is_active"]:
                    return JSONResponse(
                        {"detail": "This account is deactivated — contact an admin or sign in with another user"},
                        status_code=401,
                    )
                public = auth.user_public(user)
                _store_user_public(user_id, public)
            request.state.user = public
        except Exception:
            return JSONResponse({"detail": "Invalid or expired token"}, status_code=401)

        # Permission check for mapped routes
        perms = set(public.get("permissions") or [])
        if public.get("role") == "admin":
            return await call_next(request)

        for m, pattern, needed in ROUTE_PERMS:
            if m == method and re.match(pattern, path):
                if not any(p in perms for p in needed):
                    return JSONResponse(
                        {"detail": f"Missing permission: {' or '.join(needed)}"},
                        status_code=403,
                    )
                break

        return await call_next(request)

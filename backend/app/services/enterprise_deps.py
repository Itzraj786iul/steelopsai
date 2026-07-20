"""FastAPI dependencies for JWT auth and permission checks."""

from __future__ import annotations

from typing import Annotated, Any, Callable

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services import enterprise_auth as auth

bearer_scheme = HTTPBearer(auto_error=False)


def _client_meta(request: Request) -> tuple[str, str]:
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")
    return ip, ua


async def get_current_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any]:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = auth.decode_access_token(creds.credentials)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token") from exc
    user = auth.get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired — please sign in again")
    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This account is deactivated — contact an admin or sign in with another user",
        )
    public = auth.user_public(user)
    request.state.user = public
    return public


async def get_optional_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
) -> dict[str, Any] | None:
    if not creds or not creds.credentials:
        return None
    try:
        return await get_current_user(request, creds)
    except HTTPException:
        return None


def require_permissions(*codes: str) -> Callable:
    """Require ANY of the listed permissions (OR). Use multiple Depends for AND."""

    async def _dep(user: Annotated[dict[str, Any], Depends(get_current_user)]) -> dict[str, Any]:
        perms = set(user.get("permissions") or [])
        if user.get("role") == "admin":
            return user
        if not any(c in perms for c in codes):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {' or '.join(codes)}",
            )
        return user

    return _dep


CurrentUser = Annotated[dict[str, Any], Depends(get_current_user)]
OptionalUser = Annotated[dict[str, Any] | None, Depends(get_optional_user)]

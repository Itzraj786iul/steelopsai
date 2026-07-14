"""JSPL EAF TTT FastAPI application."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS, LOGS_DIR
from app.core.version_registry import get_version_registry
from app.middleware.enterprise_auth import EnterpriseAuthMiddleware
from app.routers.api import router
from app.routers.enterprise import router as enterprise_router
from app.routers.heat_history import router as heat_history_router
from app.routers.ops import router as ops_router
from app.routers.mes import router as mes_router
from app.services.enterprise_auth import seed_enterprise
from app.services.enterprise_db import ensure_enterprise_db
from app.services.heat_db import ensure_db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eaf.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    from app.services.ml_service import get_historical_stats, get_optimizer_engine, get_prediction_engine

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    ensure_db()
    ensure_enterprise_db()
    seed_enterprise()
    registry = get_version_registry()
    logger.info("Starting %s v%s (model %s)", APP_NAME, APP_VERSION, registry["model_phase"])
    logger.info("Heat History + Enterprise RBAC databases ready")

    async def _warm_ml() -> None:
        loop = asyncio.get_running_loop()
        start = time.perf_counter()
        try:
            await loop.run_in_executor(
                None,
                lambda: (get_prediction_engine(), get_optimizer_engine(), get_historical_stats()),
            )
            from app.services.ml_service import mark_ml_warm

            mark_ml_warm()
            logger.info("ML engines warmed in %.1fs", time.perf_counter() - start)
        except Exception:
            logger.exception("ML warmup failed — API will retry on first request")

    # Warm in background — must not block /auth/login or /health
    asyncio.create_task(_warm_ml())

    yield
    logger.info("Shutting down %s", APP_NAME)


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description=(
        "Production advisory API for JSPL Electric Arc Furnace tap-to-tap prediction and physics-guided optimization. "
        "Uses the frozen Phase 19 model and Phase 20.2 optimizer. Inputs outside historical bands return warnings, "
        "not hard validation failures. Electrical Energy (kWh) is the operator-facing label for the `POWER` field."
    ),
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "default", "description": "Prediction, optimization, historical analysis, and reporting"},
        {"name": "Enterprise Auth", "description": "JWT authentication, RBAC, users, audit, delays, alerts"},
        {"name": "Heat History", "description": "Production HeatRecord database"},
        {"name": "Production Operations", "description": "Shifts, furnaces, queue, handover, approvals, tasks"},
        {"name": "MES Production Planning", "description": "Daily plans, heat scheduler, live board, KPI wall"},
    ],
)

app.add_middleware(EnterpriseAuthMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(heat_history_router)
app.include_router(enterprise_router)
app.include_router(ops_router)
app.include_router(mes_router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s %.0fms", request.method, request.url.path, elapsed_ms)
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    messages = []
    for err in exc.errors():
        loc = ".".join(str(part) for part in err.get("loc", []) if part != "body")
        messages.append(f"{loc}: {err.get('msg', 'invalid value')}" if loc else str(err.get("msg", "invalid value")))
    return JSONResponse(
        status_code=422,
        content={
            "detail": "Request could not be parsed. Check recipe JSON structure and numeric fields.",
            "error_code": "invalid_request",
            "messages": messages,
        },
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    return JSONResponse(
        status_code=422,
        content={"detail": str(exc), "error_code": "processing_error"},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An internal error occurred while processing the request. Please retry shortly.",
            "error_code": "internal_error",
        },
    )


@app.get("/")
async def root():
    registry = get_version_registry()
    return {
        "service": APP_NAME,
        "version": APP_VERSION,
        "backend_version": registry["backend_version"],
        "docs": "/docs",
    }

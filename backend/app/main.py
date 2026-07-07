"""JSPL EAF TTT FastAPI application."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import APP_NAME, APP_VERSION, CORS_ORIGINS, LOGS_DIR
from app.routers.api import router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eaf.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    import asyncio

    from app.services.ml_service import get_historical_stats, get_prediction_engine

    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logger.info("Starting %s v%s", APP_NAME, APP_VERSION)

    async def _warm_ml() -> None:
        loop = asyncio.get_running_loop()
        start = time.perf_counter()
        try:
            await loop.run_in_executor(
                None,
                lambda: (get_prediction_engine(), get_historical_stats()),
            )
            logger.info("ML engines warmed in %.1fs", time.perf_counter() - start)
        except Exception:
            logger.exception("ML warmup failed — API will retry on first request")

    asyncio.create_task(_warm_ml())

    yield
    logger.info("Shutting down %s", APP_NAME)


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="REST API for JSPL EAF Tap-to-Tap Time prediction and physics-guided optimization.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    logger.info("%s %s %.0fms", request.method, request.url.path, elapsed_ms)
    response.headers["X-Process-Time-Ms"] = f"{elapsed_ms:.1f}"
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.get("/")
async def root():
    return {"service": APP_NAME, "version": APP_VERSION, "docs": "/docs"}

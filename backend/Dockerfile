# SteelOps EAF API — production image (Northflank / Cloud Run)
# Build from repository root (required so research/ model paths resolve):
#   docker build -f backend/Dockerfile -t steeloops-eaf-api .
#
# Layout inside the image (must match app.core.config path resolution):
#   /app/backend/          ← WORKDIR (imports app.main)
#   /app/research/         ← PROJECT_ROOT / "research"

FROM python:3.10-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PORT=8080

# OpenMP runtime required by LightGBM / XGBoost / some sklearn paths
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps before copying source for better layer caching
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --upgrade pip \
    && pip install -r /app/backend/requirements.txt

# Application code + frozen research artifacts (models, datasets, Phase 21 engines)
COPY backend/ /app/backend/
COPY research/ /app/research/

# Writable dirs for SQLite / logs (ephemeral unless a persistent volume is attached)
RUN mkdir -p \
        /app/backend/data/heat_history \
        /app/backend/data/enterprise \
        /app/backend/data/phase_33 \
        /app/backend/logs \
        /app/research/phase_21_streamlit_app/logs \
        /app/research/phase_21_streamlit_app/exports \
    && useradd --create-home --uid 1001 --shell /usr/sbin/nologin appuser \
    && chown -R appuser:appuser /app

USER appuser

WORKDIR /app/backend

EXPOSE 8080

# Northflank/Cloud Run inject PORT; default 8080 for local docker run
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]

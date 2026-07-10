"""Pydantic models for Heat History / HeatRecord API."""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


HeatStatus = Literal[
    "Draft",
    "Predicted",
    "Optimized",
    "Accepted",
    "Running",
    "Completed",
    "Validated",
    "Archived",
]


class HeatUpsertPredictionRequest(BaseModel):
    heat_number: str = ""
    session_id: str = ""
    shift: str | None = None
    operator_name: str = ""
    operator_id: str = ""
    furnace_id: str | None = "EAF-1"
    plant: str | None = "JSPL"
    supervisor_id: str | None = None
    predicted_by: str | None = None
    recipe_inputs: dict[str, Any] = Field(default_factory=dict)
    prediction: dict[str, Any] = Field(default_factory=dict)
    hybrid: dict[str, Any] | None = None
    Target_Oxygen_Program: float | None = None
    Target_Carbon_Program: float | None = None


class HeatUpdateOptimizerRequest(BaseModel):
    heat_number: str = ""
    session_id: str = ""
    recipe_inputs: dict[str, Any] | None = None
    optimizer: dict[str, Any] | None = None
    optimizer_v2: dict[str, Any] | None = None
    recommendation_status: Literal["Accepted", "Modified", "Rejected"] | None = None
    optimized_by: str | None = None
    approved_by: str | None = None


class HeatUpdateValidationRequest(BaseModel):
    heat_number: str = ""
    session_id: str = ""
    predicted_ttt: float | None = None
    actual_ttt: float | str | None = None
    operator_comments: str = ""
    recommendation_status: Literal["Accepted", "Modified", "Rejected"] | None = None
    actual_recipe: dict[str, Any] | None = None
    mark_completed: bool = False
    validated_by: str | None = None
    furnace_id: str | None = None
    supervisor_id: str | None = None
    plant: str | None = None


class HeatStatusUpdateRequest(BaseModel):
    status: HeatStatus


class HeatRecordResponse(BaseModel):
    id: str
    heat_number: str
    date: str
    time: str
    shift: str
    status: str
    operator_name: str | None = ""
    operator_id: str | None = ""
    recipe_inputs: dict[str, Any] | None = None
    HM: float | None = None
    DRI: float | None = None
    HBI: float | None = None
    Bucket: float | None = None
    LIME: float | None = None
    DOLO: float | None = None
    CPC: float | None = None
    OXY: float | None = None
    Electrical_Energy_kWh: float | None = None
    Target_Oxygen_Program: float | None = None
    Target_Carbon_Program: float | None = None
    Power_Restriction: int | None = 0
    predicted_ttt: float | None = None
    prediction_interval_low: float | None = None
    prediction_interval_high: float | None = None
    confidence: str | None = None
    historical_similarity: float | None = None
    risk_level: str | None = None
    optimized_recipe: dict[str, Any] | None = None
    optimized_ttt: float | None = None
    expected_saving: float | None = None
    v2_recipe: dict[str, Any] | None = None
    v2_ttt: float | None = None
    v2_saving: float | None = None
    reliability_index: float | None = None
    physics_confidence: float | None = None
    industrial_confidence: float | None = None
    ai_confidence: float | None = None
    consensus: str | None = None
    actual_ttt: float | None = None
    prediction_error: float | None = None
    optimizer_result: dict[str, Any] | None = None
    actual_recipe: dict[str, Any] | None = None
    recommendation_status: str | None = None
    operator_comments: str | None = ""
    explainability: dict[str, Any] | None = None
    session_id: str | None = ""
    created_at: str
    updated_at: str

    class Config:
        extra = "allow"


class HeatListResponse(BaseModel):
    items: list[HeatRecordResponse]
    total: int
    page: int
    page_size: int
    pages: int


class HeatExportRequest(BaseModel):
    format: Literal["csv", "json", "excel", "pdf"] = "csv"
    ids: list[str] | None = None
    q: str | None = None
    shift: str | None = None
    status: str | None = None
    period: str | None = None
    date_from: str | None = None
    date_to: str | None = None

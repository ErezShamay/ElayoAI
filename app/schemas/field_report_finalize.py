from __future__ import annotations

from datetime import datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field


class FinalizeRunStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    PARTIAL = "PARTIAL"


class FinalizeEmailStatus(StrEnum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"
    QUEUED = "QUEUED"


class FieldReportFinalizeRun(BaseModel):
    id: str
    organization_id: str
    report_id: str
    actor_id: str
    status: FinalizeRunStatus
    idempotency_key: str
    client_report_uuid: str | None = None
    steps_completed: list[str] = Field(default_factory=list)
    steps_failed: list[str] = Field(default_factory=list)
    email_status: FinalizeEmailStatus | None = None
    email_sent_at: datetime | None = None
    materialization: dict | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class FieldReportFinalizeStartResponse(BaseModel):
    report_id: str
    finalize_run_id: str
    status: Literal["FINALIZING"]
    message: str = (
        "הדוח בעיבוד — המייל יישלח אוטומטית בסיום"
    )


class FieldReportFinalizeRunStatus(BaseModel):
    id: str
    status: FinalizeRunStatus
    steps_completed: list[str] = Field(default_factory=list)
    steps_failed: list[str] = Field(default_factory=list)
    email_status: FinalizeEmailStatus | None = None
    email_sent_at: datetime | None = None
    materialization: dict | None = None


class FieldReportFinalizeStatusResponse(BaseModel):
    report_id: str
    status: str
    finalize_run: FieldReportFinalizeRunStatus | None = None

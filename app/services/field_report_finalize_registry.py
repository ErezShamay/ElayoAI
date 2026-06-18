"""Central registry of all Finalize Pipeline component IDs (§9)."""

from __future__ import annotations

from app.services.field_report_finalize_ai_service import AI_FINALIZE_STEP_ORDER
from app.services.field_report_finalize_email_service import (
    EMAIL_FINALIZE_STEP_ORDER,
)
from app.services.field_report_finalize_notifications_service import (
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
)
from app.services.field_report_finalize_steps import CORE_FINALIZE_STEP_ORDER

INFRASTRUCTURE_FINALIZE_STEP_ORDER: tuple[str, ...] = (
    "T01",
    "T02",
    "T03",
    "T04",
    "T05",
    "T06",
)

INFRASTRUCTURE_PRE_STEP_ORDER: tuple[str, ...] = ("T01", "T02", "T03")
INFRASTRUCTURE_POST_STEP_ORDER: tuple[str, ...] = ("T04", "T05", "T06")

FINALIZE_STEP_EXECUTION_ORDER: tuple[str, ...] = (
    *INFRASTRUCTURE_PRE_STEP_ORDER,
    *CORE_FINALIZE_STEP_ORDER,
    *EMAIL_FINALIZE_STEP_ORDER,
    *NOTIFICATIONS_FINALIZE_STEP_ORDER,
    *AI_FINALIZE_STEP_ORDER,
    *INFRASTRUCTURE_POST_STEP_ORDER,
)

EXPECTED_FINALIZE_COMPONENTS: frozenset[str] = frozenset(
    FINALIZE_STEP_EXECUTION_ORDER
)

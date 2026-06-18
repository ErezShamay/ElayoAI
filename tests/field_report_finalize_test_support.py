from __future__ import annotations

from app.schemas.field_report_finalize import FinalizeEmailStatus
from app.services.field_report_finalize_email_service import (
    FieldReportFinalizeEmailService,
    FinalizeEmailDispatchResult,
)
from app.services.field_report_finalize_notifications_service import (
    NOTIFICATIONS_FINALIZE_STEP_ORDER,
    FieldReportFinalizeNotificationsService,
    FinalizeNotificationsDispatchResult,
)
from app.services.field_report_finalize_ai_service import (
    AI_FINALIZE_STEP_ORDER,
    FieldReportFinalizeAiService,
    FinalizeAiDispatchResult,
)


class StubFinalizeEmailService(FieldReportFinalizeEmailService):
    def dispatch_after_core_steps(self, **kwargs) -> FinalizeEmailDispatchResult:
        return FinalizeEmailDispatchResult(
            email_status=FinalizeEmailStatus.SENT,
            email_sent_at="2026-06-18T10:00:00+00:00",
            steps_completed=["E04", "E05", "E02", "E03", "E01"],
            step_summaries={"E01": {"status": "SENT", "stub": True}},
            recipients=[],
            attempts=1,
        )


class StubFinalizeNotificationsService(FieldReportFinalizeNotificationsService):
    def dispatch_after_email(self, **kwargs) -> FinalizeNotificationsDispatchResult:
        return FinalizeNotificationsDispatchResult(
            steps_completed=list(NOTIFICATIONS_FINALIZE_STEP_ORDER),
            step_summaries={
                step_id: {"status": "COMPLETED", "stub": True}
                for step_id in NOTIFICATIONS_FINALIZE_STEP_ORDER
            },
        )


class StubFinalizeAiService(FieldReportFinalizeAiService):
    def schedule_after_email_and_notifications(self, **kwargs) -> FinalizeAiDispatchResult:
        return FinalizeAiDispatchResult(
            steps_completed=list(AI_FINALIZE_STEP_ORDER),
            step_summaries={
                step_id: {"status": "COMPLETED", "stub": True}
                for step_id in AI_FINALIZE_STEP_ORDER
            },
            async_scheduled=False,
        )

"""Finalize pipeline AI steps (A01–A04) — async after email + notifications."""

from __future__ import annotations

import logging
import threading
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable
from uuid import uuid4

from app.ai.workflows.finding_enrichment_workflow import (
    FindingEnrichmentWorkflow,
)
from app.config.ai_config import DEFAULT_AI_MODEL
from app.config.settings import settings
from app.prompts.prompt_registry import PROMPTS
from app.repositories.ai_interpretation_repository import (
    AIInterpretationRepository,
)
from app.repositories.field_report_finalize_run_repository import (
    FieldReportFinalizeRunRepository,
)
from app.repositories.field_visit_report_line_repository import (
    FieldVisitReportLineRepository,
)
from app.repositories.quality_issue_repository import QualityIssueRepository
from app.services.ai_review_service import AIReviewService

logger = logging.getLogger(__name__)

AI_FINALIZE_STEP_ORDER: tuple[str, ...] = (
    "A01",
    "A02",
    "A03",
    "A04",
)

EXPECTED_AI_FINALIZE_STEPS: frozenset[str] = frozenset(
    AI_FINALIZE_STEP_ORDER
)


@dataclass(frozen=True)
class ReportFindingForEnrichment:
    id: str
    report_id: str
    project_id: str
    finding_type: str
    summary: str


@dataclass(frozen=True)
class FinalizeAiDispatchResult:
    steps_completed: list[str]
    step_summaries: dict[str, dict[str, Any]]
    async_scheduled: bool


BackgroundRunner = Callable[[Callable[..., None], tuple, dict], None]


class FieldReportFinalizeAiService:
    def __init__(
        self,
        *,
        enrichment_workflow: FindingEnrichmentWorkflow | None = None,
        review_service: AIReviewService | None = None,
        interpretation_repository: AIInterpretationRepository | None = None,
        issue_repository: QualityIssueRepository | None = None,
        line_repository: FieldVisitReportLineRepository | None = None,
        run_repository: FieldReportFinalizeRunRepository | None = None,
        model_name: str | None = None,
        run_inline: bool = False,
        background_runner: BackgroundRunner | None = None,
    ) -> None:
        self.enrichment_workflow = (
            enrichment_workflow or FindingEnrichmentWorkflow()
        )
        self.review_service = review_service or AIReviewService()
        self.interpretation_repository = (
            interpretation_repository or AIInterpretationRepository()
        )
        self.issue_repository = issue_repository or QualityIssueRepository()
        self.line_repository = (
            line_repository or FieldVisitReportLineRepository()
        )
        self.run_repository = (
            run_repository or FieldReportFinalizeRunRepository()
        )
        self.model_name = model_name or DEFAULT_AI_MODEL
        self._run_inline = run_inline
        self._background_runner = background_runner
        self._ai_logs_written = 0

    def schedule_after_email_and_notifications(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        finalize_run_id: str,
        materialization: dict[str, Any] | None = None,
    ) -> FinalizeAiDispatchResult:
        """Queue A01–A04 without blocking finalize response or email."""
        flags = settings.FEATURE_FLAGS
        if not flags.enable_ai_review:
            summaries = {
                step_id: {
                    "status": "SKIPPED",
                    "reason": "FEATURE_AI_REVIEW_OFF",
                }
                for step_id in AI_FINALIZE_STEP_ORDER
            }
            return FinalizeAiDispatchResult(
                steps_completed=list(AI_FINALIZE_STEP_ORDER),
                step_summaries=summaries,
                async_scheduled=False,
            )

        if self._run_inline:
            summaries = self._execute_ai_pipeline(
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
                finalize_run_id=finalize_run_id,
                materialization=materialization or {},
            )
            return FinalizeAiDispatchResult(
                steps_completed=list(AI_FINALIZE_STEP_ORDER),
                step_summaries=summaries,
                async_scheduled=False,
            )

        scheduled_summaries = {
            step_id: {"status": "SCHEDULED"}
            for step_id in AI_FINALIZE_STEP_ORDER
        }
        self._dispatch_background(
            self._run_async_ai_pipeline,
            organization_id=organization_id,
            project_id=project_id,
            report_id=report_id,
            finalize_run_id=finalize_run_id,
            materialization=materialization or {},
        )
        return FinalizeAiDispatchResult(
            steps_completed=list(AI_FINALIZE_STEP_ORDER),
            step_summaries=scheduled_summaries,
            async_scheduled=True,
        )

    def _run_async_ai_pipeline(self, **kwargs: Any) -> None:
        summaries = self._execute_ai_pipeline(**kwargs)
        self._persist_ai_step_results(
            finalize_run_id=kwargs["finalize_run_id"],
            summaries=summaries,
        )

    def _dispatch_background(
        self,
        target: Callable[..., None],
        **kwargs: Any,
    ) -> None:
        if self._run_inline:
            target(**kwargs)
            return

        if self._background_runner is not None:
            self._background_runner(target, (), kwargs)
            return

        thread = threading.Thread(
            target=target,
            kwargs=kwargs,
            daemon=True,
            name=f"finalize-ai-{kwargs.get('report_id', 'unknown')}",
        )
        thread.start()

    def _execute_ai_pipeline(
        self,
        *,
        organization_id: str,
        project_id: str,
        report_id: str,
        finalize_run_id: str,
        materialization: dict[str, Any],
    ) -> dict[str, dict[str, Any]]:
        summaries: dict[str, dict[str, Any]] = {}
        self._ai_logs_written = 0

        try:
            summaries["A04"] = self._step_a04_prompt_registry()
            findings = self._load_new_findings(
                report_id=report_id,
                project_id=project_id,
                materialization=materialization,
            )
            interpretations = self._step_a01_enrich_findings(
                findings=findings,
                organization_id=organization_id,
                project_id=project_id,
                report_id=report_id,
            )
            summaries["A01"] = {
                "status": "COMPLETED",
                "enriched_count": len(interpretations),
                "interpretation_ids": [
                    str(item.get("id"))
                    for item in interpretations
                    if item.get("id")
                ],
                "finding_ids": [finding.id for finding in findings],
            }
            summaries["A03"] = self._step_a03_ai_client_pipeline(
                organization_id=organization_id,
                project_id=project_id,
            )
            summaries["A02"] = self._step_a02_review_queue(
                interpretations=interpretations,
                organization_id=organization_id,
            )
        except Exception as error:
            logger.exception(
                "Finalize AI pipeline failed for report %s",
                report_id,
            )
            for step_id in AI_FINALIZE_STEP_ORDER:
                summaries.setdefault(
                    step_id,
                    {
                        "status": "FAILED",
                        "error": str(error),
                        "error_type": type(error).__name__,
                    },
                )
        return summaries

    def _step_a04_prompt_registry(self) -> dict[str, Any]:
        prompt_config = PROMPTS["finding_enrichment"]
        return {
            "status": "COMPLETED",
            "prompt_name": "finding_enrichment",
            "prompt_version": prompt_config["active_version"],
        }

    def _step_a01_enrich_findings(
        self,
        *,
        findings: list[ReportFindingForEnrichment],
        organization_id: str,
        project_id: str,
        report_id: str,
    ) -> list[dict[str, Any]]:
        created: list[dict[str, Any]] = []
        for finding in findings:
            interpretation = self.enrichment_workflow.execute(
                finding,
                self.model_name,
            )
            payload = interpretation.model_dump(mode="json", exclude_none=True)
            payload.update(
                {
                    "id": str(uuid4()),
                    "project_id": project_id,
                    "report_id": report_id,
                    "finding_id": finding.id,
                    "review_status": payload.get("review_status") or "PENDING",
                    "created_at": datetime.now(UTC).isoformat(),
                }
            )
            stored = self.interpretation_repository.create_interpretation(
                payload
            )
            created.append(stored)
            self._ai_logs_written += 1
        return created

    def _step_a03_ai_client_pipeline(
        self,
        *,
        organization_id: str,
        project_id: str,
    ) -> dict[str, Any]:
        return {
            "status": "COMPLETED",
            "ai_logs_written": self._ai_logs_written,
            "pipeline": "safety_governance_cache",
            "organization_id": organization_id,
            "project_id": project_id,
        }

    def _step_a02_review_queue(
        self,
        *,
        interpretations: list[dict[str, Any]],
        organization_id: str,
    ) -> dict[str, Any]:
        pending = [
            item
            for item in interpretations
            if str(item.get("review_status") or "").upper() == "PENDING"
        ]
        pending_reviews = self.review_service.get_pending_reviews(
            organization_id=organization_id,
        )
        return {
            "status": "COMPLETED",
            "queued_count": len(pending),
            "pending_review_statuses": [
                str(item.get("review_status") or "PENDING")
                for item in interpretations
            ],
            "organization_pending_total": len(pending_reviews),
        }

    def _load_new_findings(
        self,
        *,
        report_id: str,
        project_id: str,
        materialization: dict[str, Any],
    ) -> list[ReportFindingForEnrichment]:
        created_issue_ids = list(
            materialization.get("created_issue_ids") or []
        )
        line_ids: list[str] = []
        for issue_id in created_issue_ids:
            issue = self.issue_repository.get_by_id(issue_id)
            if issue is None:
                continue
            line_id = str(issue.get("first_seen_line_id") or "").strip()
            if line_id and line_id not in line_ids:
                line_ids.append(line_id)

        if not line_ids:
            return []

        lines = self.line_repository.list_by_report(report_id)
        lines_by_id = {
            str(line.get("id")): line for line in lines if line.get("id")
        }

        findings: list[ReportFindingForEnrichment] = []
        for line_id in line_ids:
            line = lines_by_id.get(line_id)
            if line is None:
                continue
            description = str(line.get("description") or "").strip()
            trade = str(line.get("trade") or "").strip()
            severity = str(line.get("severity") or "").strip()
            findings.append(
                ReportFindingForEnrichment(
                    id=line_id,
                    report_id=report_id,
                    project_id=project_id,
                    finding_type=trade or severity or "QUALITY",
                    summary=description or "ממצא ללא תיאור",
                )
            )
        return findings

    def _persist_ai_step_results(
        self,
        *,
        finalize_run_id: str,
        summaries: dict[str, dict[str, Any]],
    ) -> None:
        run = self.run_repository.get_by_id(finalize_run_id)
        if run is None:
            return

        completed = list(run.get("steps_completed") or [])
        for step_id in AI_FINALIZE_STEP_ORDER:
            if step_id not in completed:
                completed.append(step_id)

        metadata = dict(run.get("metadata") or {})
        step_summaries = dict(metadata.get("step_summaries") or {})
        step_summaries.update(summaries)
        metadata["step_summaries"] = step_summaries
        metadata["ai_async_completed_at"] = datetime.now(UTC).isoformat()

        self.run_repository.update(
            finalize_run_id,
            {
                "steps_completed": completed,
                "metadata": metadata,
            },
        )

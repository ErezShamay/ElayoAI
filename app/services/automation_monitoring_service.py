from postgrest.exceptions import APIError

from app.repositories.ai_execution_log_repository import (
    AIExecutionLogRepository
)

from app.repositories.ai_log_repository import (
    AILogRepository,
)

from app.repositories.automation_run_repository import (
    AutomationRunRepository,
)

from app.repositories.circuit_breaker_repository import (
    CircuitBreakerRepository,
)

from app.repositories.postgrest_errors import (
    is_missing_column_error,
)

from app.services.tenant_scope_service import (
    TenantScopeService,
)

from datetime import (
    datetime,
    timezone,
)


class AutomationMonitoringService:

    def __init__(self):

        self.automation_run_repository = (
            AutomationRunRepository()
        )

        self.circuit_breaker_repository = (
            CircuitBreakerRepository()
        )

        self.client = (
            self.automation_run_repository.client
        )

        self.ai_execution_log_repository = (
            AIExecutionLogRepository()
        )

        self.ai_log_repository = (
            AILogRepository()
        )

        self.tenant_scope_service = (
            TenantScopeService()
        )

        self._supports_automation_runs_org_column: bool | None = None

    def _organization_project_ids(
        self,
        organization_id: str,
    ) -> list[str]:

        return (
            self.tenant_scope_service
            .get_organization_project_ids(
                organization_id
            )
        )

    def _supports_automation_runs_org_scope(self) -> bool:
        if self._supports_automation_runs_org_column is not None:
            return self._supports_automation_runs_org_column

        try:
            (
                self.client
                .table("automation_runs")
                .select("organization_id")
                .limit(1)
                .execute()
            )
            self._supports_automation_runs_org_column = True
        except APIError as error:
            if is_missing_column_error(error, "organization_id"):
                self._supports_automation_runs_org_column = False
            else:
                raise

        return self._supports_automation_runs_org_column

    def _scoped_automation_runs_query(
        self,
        organization_id: str | None,
    ):

        request = (
            self.client
            .table("automation_runs")
            .select("*")
        )

        if organization_id:
            if self._supports_automation_runs_org_scope():
                request = request.eq(
                    "organization_id",
                    organization_id,
                )
            else:
                request = request.eq(
                    "id",
                    "00000000-0000-0000-0000-000000000000",
                )

        return request

    # ==========================================
    # GET RECENT RUNS
    # ==========================================

    def get_recent_runs(
        self,
        limit: int = 20,
        organization_id: str | None = None,
    ):

        try:
            response = (
                self._scoped_automation_runs_query(
                    organization_id
                )
                .order(
                    "started_at",
                    desc=True
                )
                .limit(limit)
                .execute()
            )
        except APIError:
            return []

        return response.data or []

    # ==========================================
    # GET AUTOMATION STATS
    # ==========================================

    def get_automation_stats(
        self,
        organization_id: str | None = None,
    ):

        runs = (
            self.get_recent_runs(
                100,
                organization_id=organization_id,
            )
        )

        total_runs = len(runs)

        completed_runs = len([

            run for run in runs

            if run["status"]
            == "COMPLETED"
        ])

        failed_runs = len([

            run for run in runs

            if run["status"]
            == "COMPLETED_WITH_ERRORS"
        ])

        processed_count = sum([

            run.get(
                "processed_count",
                0
            )

            for run in runs
        ])

        error_count = sum([

            run.get(
                "error_count",
                0
            )

            for run in runs
        ])

        if total_runs == 0:
            health = "NO_DATA"
        elif failed_runs == 0:
            health = "HEALTHY"
        else:
            health = "DEGRADED"

        return {

            "health":
                health,

            "total_runs":
                total_runs,

            "completed_runs":
                completed_runs,

            "failed_runs":
                failed_runs,

            "processed_count":
                processed_count,

            "error_count":
                error_count,
        }

    # ==========================================
    # GET AUTOMATION HEALTH DASHBOARD
    # ==========================================

    def get_automation_health_dashboard(
        self,
        organization_id: str | None = None,
    ):

        runs = (
            self.get_recent_runs(
                100,
                organization_id=organization_id,
            )
        )

        include_platform_infrastructure = (
            organization_id is None
        )

        circuit_breakers = (
            self.get_circuit_breakers()
            if include_platform_infrastructure
            else []
        )

        ai_recovery = (
            self.get_ai_recovery_monitoring(
                organization_id=organization_id,
            )
        )

        summary = (
            self.build_run_summary(
                runs
            )
        )

        circuit_breaker_summary = (
            self.build_circuit_breaker_summary(
                circuit_breakers
            )
        )

        job_health = (
            self.build_job_health(
                runs
            )
        )

        alerts = (
            self.build_health_alerts(

                summary=summary,

                circuit_breaker_summary=
                    circuit_breaker_summary,

                ai_recovery=
                    ai_recovery,

                include_circuit_breaker_alerts=
                    include_platform_infrastructure,
            )
        )

        health = (
            self.resolve_dashboard_health(

                summary=summary,

                circuit_breaker_summary=
                    circuit_breaker_summary,

                ai_recovery=
                    ai_recovery,
            )
        )

        ai_runtime_summary = (
            self.build_ai_runtime_summary(
                organization_id=organization_id,
            )
        )

        has_activity = (
            self._has_observed_automation_activity(
                summary,
                ai_recovery,
                ai_runtime_summary,
            )
        )

        if health == "NO_DATA" and has_activity:
            health = self.resolve_ai_runtime_health(
                ai_runtime_summary
            )

        return {

            "health":
                health,

            "has_activity":
                has_activity,

            "generated_at":
                datetime.now(
                    timezone.utc
                ).isoformat(),

            "summary":
                summary,

            "job_health":
                job_health,

            "circuit_breaker_summary":
                circuit_breaker_summary,

            "ai_recovery_summary": {

                "recovery_queue_count":
                    ai_recovery[
                        "recovery_queue_count"
                    ],

                "dead_letter_count":
                    ai_recovery[
                        "dead_letter_count"
                    ],
            },

            "alerts":
                alerts,
        }

    def build_run_summary(
        self,
        runs: list[dict],
    ):

        total_runs = (
            len(runs)
        )

        completed_runs = (
            self.count_runs_by_status(
                runs,
                "COMPLETED",
            )
        )

        completed_with_errors = (
            self.count_runs_by_status(
                runs,
                "COMPLETED_WITH_ERRORS",
            )
        )

        failed_runs = (
            self.count_runs_by_status(
                runs,
                "FAILED",
            )
        )

        skipped_runs = (
            self.count_runs_by_status(
                runs,
                "SKIPPED",
            )
        )

        running_runs = (
            self.count_runs_by_status(
                runs,
                "RUNNING",
            )
        )

        processed_count = sum([

            run.get(
                "processed_count",
                0
            )

            for run in runs
        ])

        error_count = sum([

            run.get(
                "error_count",
                0
            )

            for run in runs
        ])

        healthy_runs = (
            completed_runs
            + skipped_runs
        )

        success_rate = (
            round(
                healthy_runs
                / total_runs
                * 100,
                1,
            )
            if total_runs
            else None
        )

        error_rate = (
            round(
                error_count
                / processed_count
                * 100,
                1,
            )
            if processed_count
            else None
        )

        return {

            "total_runs":
                total_runs,

            "completed_runs":
                completed_runs,

            "completed_with_errors":
                completed_with_errors,

            "failed_runs":
                failed_runs,

            "skipped_runs":
                skipped_runs,

            "running_runs":
                running_runs,

            "processed_count":
                processed_count,

            "error_count":
                error_count,

            "success_rate":
                success_rate,

            "error_rate":
                error_rate,
        }

    def build_job_health(
        self,
        runs: list[dict],
    ):

        grouped_runs: dict[str, list[dict]] = {}

        for run in runs:

            job_name = (
                run.get(
                    "job_name",
                    "unknown"
                )
            )

            grouped_runs.setdefault(
                job_name,
                []
            ).append(
                run
            )

        job_health = []

        for job_name, job_runs in grouped_runs.items():

            summary = (
                self.build_run_summary(
                    job_runs
                )
            )

            latest_run = (
                job_runs[0]
            )

            health = (
                self.resolve_job_health(
                    summary
                )
            )

            job_health.append({

                "job_name":
                    job_name,

                "health":
                    health,

                "last_status":
                    latest_run.get(
                        "status"
                    ),

                "last_started_at":
                    latest_run.get(
                        "started_at"
                    ),

                "last_completed_at":
                    latest_run.get(
                        "completed_at"
                    ),

                **summary,
            })

        return sorted(

            job_health,

            key=lambda job: (
                job.get(
                    "job_name"
                )
            ),
        )

    def build_circuit_breaker_summary(
        self,
        circuit_breakers: list[dict],
    ):

        return {

            "total":
                len(circuit_breakers),

            "open":
                self.count_breakers_by_state(
                    circuit_breakers,
                    "OPEN",
                ),

            "half_open":
                self.count_breakers_by_state(
                    circuit_breakers,
                    "HALF_OPEN",
                ),

            "closed":
                self.count_breakers_by_state(
                    circuit_breakers,
                    "CLOSED",
                ),
        }

    def build_health_alerts(
        self,
        summary: dict,
        circuit_breaker_summary: dict,
        ai_recovery: dict,
        include_circuit_breaker_alerts: bool = True,
    ):

        alerts = []

        if summary["failed_runs"] > 0:

            alerts.append({
                "severity":
                    "CRITICAL",
                "title":
                    "Automation job failures",
                "description":
                    (
                        f"{summary['failed_runs']} "
                        "recent jobs failed"
                    ),
            })

        if summary["completed_with_errors"] > 0:

            alerts.append({
                "severity":
                    "WARNING",
                "title":
                    "Runs completed with errors",
                "description":
                    (
                        f"{summary['completed_with_errors']} "
                        "recent jobs completed with errors"
                    ),
            })

        if (
            include_circuit_breaker_alerts
            and circuit_breaker_summary["open"] > 0
        ):

            alerts.append({
                "severity":
                    "CRITICAL",
                "title":
                    "Open circuit breakers",
                "description":
                    (
                        f"{circuit_breaker_summary['open']} "
                        "breakers are open"
                    ),
            })

        if ai_recovery["dead_letter_count"] > 0:

            alerts.append({
                "severity":
                    "WARNING",
                "title":
                    "Dead-letter executions",
                "description":
                    (
                        f"{ai_recovery['dead_letter_count']} "
                        "AI executions need review"
                    ),
            })

        return alerts

    def _has_observed_automation_activity(
        self,
        summary: dict,
        ai_recovery: dict,
        ai_runtime_summary: dict | None = None,
    ) -> bool:

        return (
            summary.get(
                "total_runs",
                0,
            ) > 0
            or summary.get(
                "failed_runs",
                0,
            ) > 0
            or summary.get(
                "completed_with_errors",
                0,
            ) > 0
            or ai_recovery.get(
                "recent_count",
                0,
            ) > 0
            or ai_recovery.get(
                "recovery_queue_count",
                0,
            ) > 0
            or ai_recovery.get(
                "dead_letter_count",
                0,
            ) > 0
            or (ai_runtime_summary or {}).get(
                "total",
                0,
            ) > 0
        )

    def _map_ai_log_to_execution(
        self,
        row: dict,
    ) -> dict:

        return {
            "id": row.get("id"),
            "execution_type": row.get("prompt_name") or "AI_RUNTIME",
            "status": (
                "SUCCESS"
                if row.get("success")
                else "FAILED"
            ),
            "confidence_score": row.get("confidence_score"),
            "failure_type": (
                None
                if row.get("success")
                else "AI_RUNTIME_FAILURE"
            ),
            "severity": None,
            "created_at": row.get("created_at"),
            "project_id": row.get("project_id"),
            "provider": row.get("provider"),
            "model_name": row.get("model_name"),
        }

    def build_ai_runtime_summary(
        self,
        organization_id: str | None = None,
    ) -> dict:

        project_ids = None
        if organization_id:
            project_ids = (
                self._organization_project_ids(
                    organization_id
                )
            )

        rows = (
            self.ai_log_repository
            .list_recent_for_scope(
                limit=100,
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )

        total = len(rows)
        failed = len([
            row for row in rows
            if not row.get("success")
        ])
        successful = total - failed

        success_rate = (
            round(
                successful / total * 100,
                1,
            )
            if total
            else None
        )

        return {
            "total": total,
            "successful": successful,
            "failed": failed,
            "success_rate": success_rate,
        }

    def resolve_ai_runtime_health(
        self,
        ai_runtime_summary: dict,
    ) -> str:

        if ai_runtime_summary.get("failed", 0) > 0:
            return "DEGRADED"

        if ai_runtime_summary.get("total", 0) > 0:
            return "HEALTHY"

        return "NO_DATA"

    def resolve_dashboard_health(
        self,
        summary: dict,
        circuit_breaker_summary: dict,
        ai_recovery: dict,
    ):

        if not self._has_observed_automation_activity(
            summary,
            ai_recovery,
        ):
            return "NO_DATA"

        if (
            summary["failed_runs"] > 0
            or circuit_breaker_summary["open"] > 0
        ):

            return "CRITICAL"

        if (
            summary["completed_with_errors"] > 0
            or ai_recovery["dead_letter_count"] > 0
            or ai_recovery["recovery_queue_count"] > 0
            or circuit_breaker_summary["half_open"] > 0
        ):

            return "DEGRADED"

        return "HEALTHY"

    def resolve_job_health(
        self,
        summary: dict,
    ):

        if summary["failed_runs"] > 0:

            return "CRITICAL"

        if summary["completed_with_errors"] > 0:

            return "DEGRADED"

        return "HEALTHY"

    def count_runs_by_status(
        self,
        runs: list[dict],
        status: str,
    ):

        return len([

            run for run in runs

            if run.get(
                "status"
            ) == status
        ])

    def count_breakers_by_state(
        self,
        circuit_breakers: list[dict],
        state: str,
    ):

        return len([

            breaker for breaker in circuit_breakers

            if breaker.get(
                "state"
            ) == state
        ])

    # ==========================================
    # GET CIRCUIT BREAKERS
    # ==========================================

    def get_circuit_breakers(
        self,
        organization_id: str | None = None,
    ):

        if organization_id:
            return []

        return self.circuit_breaker_repository.list_breakers()

    # ==========================================
    # GET AI RECOVERY MONITORING
    # ==========================================

    def get_ai_recovery_monitoring(
        self,
        organization_id: str | None = None,
    ):

        project_ids = None

        if organization_id:
            project_ids = (
                self._organization_project_ids(
                    organization_id
                )
            )

        recent_executions = (
            self.ai_execution_log_repository
            .get_recent_executions(
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )

        recovery_queue = (
            self.ai_execution_log_repository
            .get_failed_executions(
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )

        dead_letters = (
            self.ai_execution_log_repository
            .get_dead_letters(
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )

        return {

            "recent_executions":
                recent_executions,

            "recovery_queue":
                recovery_queue,

            "dead_letters":
                dead_letters,

            "recent_count":
                len(recent_executions),

            "recovery_queue_count":
                len(recovery_queue),

            "dead_letter_count":
                len(dead_letters),
        }

    # ==========================================
    # GET AI EXECUTION LOGS DASHBOARD
    # ==========================================

    def get_ai_execution_logs_dashboard(
        self,
        organization_id: str | None = None,
    ):

        project_ids = None

        if organization_id:
            project_ids = (
                self._organization_project_ids(
                    organization_id
                )
            )

        executions = (
            self.ai_execution_log_repository
            .get_recent_executions(
                100,
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )

        runtime_logs = (
            self.ai_log_repository
            .list_recent_for_scope(
                limit=100,
                organization_id=organization_id,
                project_ids=project_ids,
            )
        )
        runtime_executions = [
            self._map_ai_log_to_execution(row)
            for row in runtime_logs
        ]

        merged_by_id = {
            execution["id"]: execution
            for execution in executions
            if execution.get("id")
        }
        for execution in runtime_executions:
            execution_id = execution.get("id")
            if execution_id and execution_id not in merged_by_id:
                merged_by_id[execution_id] = execution

        executions = sorted(
            merged_by_id.values(),
            key=lambda item: item.get("created_at") or "",
            reverse=True,
        )[:100]

        status_counts = (
            self.count_by_key(
                executions,
                "status",
            )
        )

        execution_type_counts = (
            self.count_by_key(
                executions,
                "execution_type",
            )
        )

        failure_type_counts = (
            self.count_by_key(
                [
                    execution
                    for execution
                    in executions
                    if execution.get(
                        "failure_type"
                    )
                ],
                "failure_type",
            )
        )

        severity_counts = (
            self.count_by_key(
                [
                    execution
                    for execution
                    in executions
                    if execution.get(
                        "severity"
                    )
                ],
                "severity",
            )
        )

        total = (
            len(executions)
        )

        failed = (
            status_counts.get(
                "FAILED",
                0
            )
        )

        successful = (
            status_counts.get(
                "SUCCESS",
                0
            )
        )

        recovered = (
            status_counts.get(
                "RECOVERED",
                0
            )
        )

        skipped = (
            status_counts.get(
                "SKIPPED",
                0
            )
            + status_counts.get(
                "LOW_CONFIDENCE",
                0
            )
            + status_counts.get(
                "NO_ACTION_NEEDED",
                0
            )
        )

        classified_failures = len([

            execution for execution in executions

            if (
                execution.get(
                    "status"
                ) == "FAILED"
                and execution.get(
                    "failure_type"
                )
            )
        ])

        classification_rate = (
            round(
                classified_failures
                / failed
                * 100,
                1,
            )
            if failed
            else None
        )

        success_rate = (
            round(
                successful
                / total
                * 100,
                1,
            )
            if total
            else None
        )

        return {

            "summary": {

                "total":
                    total,

                "successful":
                    successful,

                "failed":
                    failed,

                "recovered":
                    recovered,

                "skipped":
                    skipped,

                "dead_lettered":
                    status_counts.get(
                        "DEAD_LETTERED",
                        0
                    ),

                "classification_rate":
                    classification_rate,

                "success_rate":
                    success_rate,
            },

            "status_counts":
                status_counts,

            "execution_type_counts":
                execution_type_counts,

            "failure_type_counts":
                failure_type_counts,

            "severity_counts":
                severity_counts,

            "recent_executions":
                executions[:25],
        }

    def get_automation_retries_dashboard(
        self,
    ):
        recovery_queue = (
            self.ai_execution_log_repository
            .get_failed_executions()
        )
        dead_letters = (
            self.ai_execution_log_repository
            .get_dead_letters()
        )
        retry_count_distribution = self.count_by_key(
            [
                {
                    "retry_count": str(
                        execution.get("retry_count", 0)
                    )
                }
                for execution in recovery_queue
            ],
            "retry_count",
        )
        return {
            "summary": {
                "queued_retries": len(recovery_queue),
                "dead_letters": len(dead_letters),
                "retry_count_distribution": retry_count_distribution,
            },
            "recovery_queue": recovery_queue[:50],
            "dead_letters": dead_letters[:50],
        }

    def count_by_key(
        self,
        items: list[dict],
        key: str,
    ):

        counts = {}

        for item in items:

            value = (
                item.get(
                    key
                )
                or "UNKNOWN"
            )

            counts[value] = (
                counts.get(
                    value,
                    0
                )
                + 1
            )

        return counts

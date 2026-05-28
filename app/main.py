import shutil

from datetime import UTC, datetime
from pathlib import Path

from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
    Request,
    UploadFile,
    File,
    Form,
)
from fastapi.responses import JSONResponse

from fastapi.middleware.cors import (
    CORSMiddleware
)

from pydantic import BaseModel

from app.config.settings import settings
from app.config import config_manager
from app.auth import (
    APIAuthorizationMiddleware,
    JWTService,
    PERMISSION_MATRIX,
    get_auth_context,
    require_permission,
)

from app.agent.orchestrator import (
    Orchestrator
)

from app.agent.workflow_history import (
    WorkflowHistory
)

from app.services.approval_service import (
    ApprovalService
)

from app.services.ai_review_service import (
    AIReviewService
)

from app.services.operational_action_service import (
    OperationalActionService
)

from app.services.project_insights_service import (
    ProjectInsightsService,
)

from app.repositories.project_repository import (
    ProjectRepository
)

from app.repositories.organization_repository import (
    OrganizationRepository
)

from app.repositories.ai_interpretation_repository import (
    AIInterpretationRepository
)

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.repositories.weekly_report_repository import (
    WeeklyReportRepository
)

from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository,
)

from app.services.report_processing_service import (
    ReportProcessingService,
)

from app.services.operational_action_service import (
    OperationalActionService,
)

from app.services.project_workspace_service import (
    ProjectWorkspaceService
)

from app.services.operational_summary_service import (
    OperationalSummaryService
)

from app.services.profile_service import (
    ProfileService
)

from app.services.notification_service import (
    NotificationService
)

from app.services.portfolio_insights_service import (
    PortfolioInsightsService
)

from app.services.alert_engine_service import (
    AlertEngineService
)

from app.services.automation_monitoring_service import (
    AutomationMonitoringService
)

# ==========================================
# EXCEPTION HANDLING & LOGGING
# ==========================================

from app.exceptions import (
    GlobalExceptionHandler,
    IdempotencyMiddleware,
    RequestLoggingMiddleware,
    setup_logging,
    get_logger,
)

# ==========================================
# AUTOMATION
# ==========================================

from app.automation.scheduler import (
    scheduler
)

from app.automation.jobs import (
    register_automation_jobs
)

automation_monitoring_service = (
    AutomationMonitoringService()
)

# ==========================================
# LOGGING SETUP
# ==========================================

setup_logging()
logger = get_logger(__name__)

logger.info("OrgFlow Agent starting up")
jwt_service = JWTService()

FRONTEND_URL = str(settings.FRONTEND_URL)
IS_AUTOMATION_ENABLED = settings.FEATURE_FLAGS.enable_automation

FRONTEND_URLS = [
    FRONTEND_URL,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://localhost:3000",
    "https://127.0.0.1:3000",
]

# ==========================================
# APP
# ==========================================

app = FastAPI()
app.state.startup_complete = False

DEMO_ORGANIZATION_ID = (
    "bb2c760b-81cb-4e49-b057-4426406d5e71"
)

# ==========================================
# MIDDLEWARE
# ==========================================

# Add request logging middleware before exception handling
app.add_middleware(
    RequestLoggingMiddleware
)

# Add idempotency middleware for write requests
app.add_middleware(
    IdempotencyMiddleware
)

# Add global exception handler middleware (must be first)
app.add_middleware(
    GlobalExceptionHandler
)

app.add_middleware(
    APIAuthorizationMiddleware,
    public_paths={
        "/",
        "/healthcheck",
        "/readiness",
        "/liveness",
        "/__test/error",
        "/feature-flags",
        "/config",
        "/config/reload",
        "/secrets/rotation-status",
        "/auth/refresh",
    },
)

# ==========================================
# CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=FRONTEND_URLS,

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],
)

# ==========================================
# SERVICES
# ==========================================

orchestrator = (
    Orchestrator()
)

workflow_history = (
    WorkflowHistory()
)

approval_service = (
    ApprovalService()
)

ai_review_service = (
    AIReviewService()
)

operational_action_service = (
    OperationalActionService()
)

project_repository = (
    ProjectRepository()
)

organization_repository = (
    OrganizationRepository()
)

ai_interpretation_repository = (
    AIInterpretationRepository()
)

operational_action_repository = (
    OperationalActionRepository()
)

weekly_report_repository = (
    WeeklyReportRepository()
)

project_workspace_service = (
    ProjectWorkspaceService()
)

operational_summary_service = (
    OperationalSummaryService()
)

portfolio_insights_service = (
    PortfolioInsightsService()
)

alert_engine_service = (
    AlertEngineService()
)

profile_service = (
    ProfileService()
)

notification_service = (
    NotificationService()
)

report_processing_service = (
    ReportProcessingService()
)

# ==========================================
# AUTOMATION ENGINE
# ==========================================

@app.on_event("startup")
def startup_event():
    if IS_AUTOMATION_ENABLED:
        register_automation_jobs()

        if not scheduler.running:
            scheduler.start()
            print(
                "[AUTOMATION] Scheduler started"
            )
    else:
        logger.info(
            "Automation disabled by feature flag"
        )

    app.state.startup_complete = True


@app.on_event("shutdown")
def shutdown_event():
    app.state.startup_complete = False

    if scheduler.running:
        scheduler.shutdown(wait=False)
        print(
            "[AUTOMATION] Scheduler stopped"
        )

# ==========================================
# REQUEST MODELS
# ==========================================

class AgentRequest(
    BaseModel
):

    user_request: str


class ReviewDecisionRequest(
    BaseModel
):

    reviewed_by: str

    review_notes: str | None = None


class AssignActionRequest(
    BaseModel
):

    assigned_to: str


# ==========================================
# ROOT
# ==========================================

@app.get("/")
def root():

    return {
        "message":
            "OrgFlow AI Agent is running"
    }


@app.get("/healthcheck")
def healthcheck():

    return {
        "status": "ok",
        "service": "orgflow-agent",
        "environment": settings.ENVIRONMENT,
    }


@app.get("/readiness")
def readiness():
    checks = {
        "startup_complete": bool(app.state.startup_complete),
        "scheduler_running": bool(scheduler.running) if IS_AUTOMATION_ENABLED else True,
        "automation_enabled": IS_AUTOMATION_ENABLED,
        "supabase_configured": bool(
            settings.SUPABASE_URL and settings.SUPABASE_KEY
        ),
    }

    is_ready = checks["startup_complete"] and checks["scheduler_running"]
    payload = {
        "status": "ready" if is_ready else "not_ready",
        "service": "orgflow-agent",
        "checks": checks,
    }

    if not is_ready:
        return JSONResponse(status_code=503, content=payload)

    return payload


@app.get("/liveness")
def liveness():
    return {
        "status": "alive",
        "service": "orgflow-agent",
        "environment": settings.ENVIRONMENT,
        "timestamp": (
            datetime
            .now(UTC)
            .isoformat()
        ),
    }


@app.get("/feature-flags")
def get_feature_flags():
    current_settings = config_manager.get_settings()
    return {
        "environment": current_settings.ENVIRONMENT,
        "flags": current_settings.FEATURE_FLAGS.model_dump(),
    }


@app.get("/config")
def get_runtime_config():
    return {
        "environment": config_manager.get_settings().ENVIRONMENT,
        "config": config_manager.get_safe_snapshot(),
    }


@app.post("/config/reload")
def reload_runtime_config():
    updated = config_manager.force_reload()
    return {
        "status": "reloaded",
        "environment": updated.ENVIRONMENT,
    }


@app.get("/secrets/rotation-status")
def get_secret_rotation_status():
    return config_manager.get_secret_rotation_status()


@app.get("/auth/me")
def get_current_session(auth=Depends(get_auth_context)):
    return {
        "user_id": auth.user_id,
        "org_id": auth.org_id,
        "role": auth.role,
        "effective_user_id": auth.effective_user_id,
        "permissions": sorted(auth.permissions),
    }


@app.get("/auth/permission-matrix")
def get_permission_matrix():
    return {role: sorted(perms) for role, perms in PERMISSION_MATRIX.items()}


@app.get("/auth/tenant/check")
def tenant_check(auth=Depends(get_auth_context)):
    return {"status": "ok", "org_id": auth.org_id}


@app.get("/auth/secure/reports")
def secure_reports(_: object = Depends(require_permission("reports:read"))):
    return {"status": "ok"}


@app.get("/auth/secure/admin")
def secure_admin(_: object = Depends(require_permission("users:write"))):
    return {"status": "ok"}


@app.get("/auth/impersonation/status")
def impersonation_status(auth=Depends(get_auth_context)):
    return {
        "is_impersonating": bool(auth.effective_user_id),
        "actor_user_id": auth.user_id,
        "effective_user_id": auth.actor_user_id,
    }


@app.post("/auth/refresh")
def refresh_access_token(request: Request):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer refresh token")

    refresh_token = auth_header.replace("Bearer ", "", 1).strip()
    payload = jwt_service.decode_refresh_token(refresh_token)
    access_token = jwt_service.issue_access_token(
        user_id=payload["sub"],
        org_id=payload["org_id"],
        role=payload["role"],
        token_id=str(payload.get("jti", "refresh-rotation")),
    )
    logger.info(
        "Refresh token exchanged",
        extra={
            "event": "audit.refresh",
            "user_id": payload["sub"],
            "org_id": payload["org_id"],
        },
    )
    return {"access_token": access_token, "token_type": "Bearer"}

# ==========================================
# AGENT APIs
# ==========================================

@app.post("/agent/run")
def run_agent(
    request: AgentRequest
):

    return orchestrator.run(
        request.user_request
    )


@app.get("/workflow-runs")
def get_workflow_runs():

    return workflow_history.get_runs()

# ==========================================
# APPROVAL APIs
# ==========================================

@app.post(
    "/approval/{approval_id}/approve"
)
def approve_request(
    approval_id: int
):

    return approval_service.approve(
        approval_id
    )


@app.get(
    "/approval/{approval_id}"
)
def get_approval_request(
    approval_id: int
):

    return approval_service.get_request(
        approval_id
    )

# ==========================================
# AI REVIEW APIs
# ==========================================

@app.get("/reviews/pending")
def get_pending_reviews():

    return (
        ai_review_service
        .get_pending_reviews()
    )

@app.get("/organizations")
def get_organizations():

    return (
        organization_repository
        .get_all_organizations()
    )

@app.get("/profiles/{profile_id}")
def get_profile(profile_id: str):

    profile = (
        profile_service
        .get_profile(profile_id)
    )

    if not profile:

        raise HTTPException(
            status_code=404,
            detail="Profile not found"
        )

    return profile

@app.get("/profiles/{profile_id}/notifications")
def get_profile_notifications(profile_id: str):

    return (
        notification_service
        .get_notifications(profile_id)
    )

@app.get("/projects/{project_id}/workspace")
def get_project_workspace(project_id: str):

    return (
        project_workspace_service
        .get_workspace(project_id)
    )

@app.get("/projects/{project_id}/exceptions")
def get_project_exceptions(project_id: str):

    return (
        operational_action_repository
        .get_exceptions_by_project(project_id)
    )

@app.get("/projects/{project_id}/operational-summary")
def get_project_operational_summary(project_id: str):

    return (
        operational_summary_service
        .generate_project_summary(project_id)
    )

@app.patch("/notifications/{notification_id}/read")
def mark_notification_as_read(notification_id: str):

    return (
        notification_service
        .mark_as_read(notification_id)
    )

# ==========================================
# AUTOMATION APIs
# ==========================================

@app.get(
    "/automation/runs"
)
def get_automation_runs():

    return (
        automation_monitoring_service
        .get_recent_runs()
    )


@app.get(
    "/automation/stats"
)
def get_automation_stats():

    return (
        automation_monitoring_service
        .get_automation_stats()
    )


@app.get(
    "/automation/health"
)
def get_automation_health():

    return (
        automation_monitoring_service
        .get_automation_health_dashboard()
    )


@app.get(
    "/automation/circuit-breakers"
)
def get_automation_circuit_breakers():

    return (
        automation_monitoring_service
        .get_circuit_breakers()
    )


@app.get(
    "/automation/ai-recovery"
)
def get_automation_ai_recovery():

    return (
        automation_monitoring_service
        .get_ai_recovery_monitoring()
    )


@app.get(
    "/automation/ai-execution-logs"
)
def get_automation_ai_execution_logs():

    return (
        automation_monitoring_service
        .get_ai_execution_logs_dashboard()
    )

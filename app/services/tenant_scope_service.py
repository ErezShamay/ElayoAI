from app.repositories.finding_repository import (
    FindingRepository,
)
from app.repositories.profile_repository import (
    ProfileRepository,
)
from app.repositories.project_repository import (
    ProjectRepository,
)
from app.repositories.report_repository import (
    ReportRepository,
)
from app.services.supervisor_project_scope import (
    filter_supervised_projects,
    project_supervised_by,
    resolve_supervisor_email,
    should_scope_projects_to_supervisor,
)


class TenantScopeService:

    def __init__(
        self,
        project_repository: ProjectRepository | None = None,
        finding_repository: FindingRepository | None = None,
        profile_repository: ProfileRepository | None = None,
        report_repository: ReportRepository | None = None,
    ):
        self.project_repository = project_repository or ProjectRepository()
        self.finding_repository = finding_repository or FindingRepository()
        self.profile_repository = profile_repository or ProfileRepository()
        self.report_repository = report_repository or ReportRepository()

    def get_organization_scoped_project(
        self,
        project_id: str,
        organization_id: str,
        *,
        role: str | None = None,
        actor_user_id: str | None = None,
        profile_repository: ProfileRepository | None = None,
    ) -> dict | None:
        project = (
            self.project_repository
            .get_project_by_id(project_id)
        )

        if not project:
            return None

        if str(project.get("organization_id") or "") != organization_id:
            return None

        if should_scope_projects_to_supervisor(role):
            repository = profile_repository or self.profile_repository
            supervisor_email = resolve_supervisor_email(
                repository,
                actor_user_id or "",
            )
            if not project_supervised_by(project, supervisor_email):
                return None

        return project

    def filter_actor_projects(
        self,
        projects: list[dict],
        *,
        role: str | None,
        actor_user_id: str | None,
        profile_repository: ProfileRepository | None = None,
    ) -> list[dict]:
        if not should_scope_projects_to_supervisor(role):
            return projects

        repository = profile_repository or self.profile_repository
        supervisor_email = resolve_supervisor_email(
            repository,
            actor_user_id or "",
        )
        return filter_supervised_projects(
            projects,
            role=role,
            supervisor_email=supervisor_email,
        )

    def get_organization_project_ids(
        self,
        organization_id: str,
    ) -> list[str]:
        projects = (
            self.project_repository
            .get_projects_by_organization(
                organization_id
            )
        )

        return [
            project["id"]
            for project in projects
            if project.get("id")
        ]

    def resolve_project_id_for_finding(
        self,
        finding_id: str | None,
    ) -> str | None:
        if not finding_id:
            return None

        finding = (
            self.finding_repository
            .get_finding_by_id(finding_id)
        )

        if not finding:
            return None

        report_id = finding.get("report_id")

        if not report_id:
            return None

        return self.report_repository.get_project_id_for_report(report_id)

    def action_belongs_to_organization(
        self,
        action: dict,
        organization_id: str,
        project_ids: set[str],
    ) -> bool:
        action_org = action.get("organization_id")

        if (
            action_org
            and action_org != organization_id
        ):
            return False

        project_id = action.get("project_id")

        if project_id:
            return project_id in project_ids

        interpretation_id = action.get(
            "interpretation_id"
        )

        if not interpretation_id:
            return False

        from app.repositories.ai_interpretation_repository import (
            AIInterpretationRepository,
        )

        interpretation = (
            AIInterpretationRepository()
            .get_review_by_id(
                interpretation_id
            )
        )

        if not interpretation:
            return False

        resolved_project_id = (
            self.resolve_project_id_for_finding(
                interpretation.get("finding_id")
            )
        )

        return (
            resolved_project_id in project_ids
            if resolved_project_id
            else False
        )

    def review_belongs_to_organization(
        self,
        review: dict,
        project_ids: set[str],
    ) -> bool:
        resolved_project_id = (
            self.resolve_project_id_for_finding(
                review.get("finding_id")
            )
        )

        return (
            resolved_project_id in project_ids
            if resolved_project_id
            else False
        )

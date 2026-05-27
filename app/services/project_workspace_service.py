from app.repositories.project_repository import (
    ProjectRepository
)

from app.repositories.operational_action_repository import (
    OperationalActionRepository
)

from app.repositories.weekly_report_repository import (
    WeeklyReportRepository
)

from app.repositories.workspace_activity_repository import (
    WorkspaceActivityRepository
)

from app.services.ai_review_service import (
    AIReviewService
)

from app.services.project_insights_service import (
    ProjectInsightsService
)

from app.services.project_health_service import (
    ProjectHealthService
)


class ProjectWorkspaceService:

    def __init__(self):

        self.project_repository = (
            ProjectRepository()
        )

        self.review_service = (
            AIReviewService()
        )

        self.action_repository = (
            OperationalActionRepository()
        )

        self.report_repository = (
            WeeklyReportRepository()
        )

    def get_workspace(
        self,
        project_id: str,
    ):

        project = (
            self.project_repository
            .get_project_by_id(
                project_id
            )
        )

        reviews = (
            self.review_service
            .get_reviews_by_project(
                project_id
            )
        )

        actions = (
            self.action_repository
            .get_open_actions_by_project(
                project_id
            )
        )

        exceptions = (
            self.action_repository
            .get_exceptions_by_project(
                project_id
            )
        )

        activities = (
            WorkspaceActivityRepository
            .get_project_activity(
                project_id
            )
        )

        insights = (
            ProjectInsightsService
            .generate_project_insights(
                project_id
            )
        )

        reports = (
            self.report_repository
            .get_reports_by_project(
                project_id
            )
        )

        health = (
            ProjectHealthService
            .calculate_health(

                reviews=
                    reviews,

                actions=
                    actions,

                escalations=
                    exceptions,
            )
        )

        summary = {

            "reviews_count":
                len(reviews),

            "actions_count":
                len(actions),

            "escalations_count":
                len(exceptions),

            "reports_count":
                len(reports),
        }

        return {

            "project":
                project,

            "reviews":
                reviews,

            "actions":
                actions,

            "exceptions":
                exceptions,

            "activities":
                activities,

            "insights":
                insights,

            "health":
                health,

            "summary":
                summary,
        }
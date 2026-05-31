from concurrent.futures import (
    ThreadPoolExecutor,
)

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

        if not project:
            return {
                "project": None,
                "reviews": [],
                "actions": [],
                "exceptions": [],
                "activities": [],
                "insights": [],
                "health": {
                    "score": 100,
                    "status": "HEALTHY",
                },
                "summary": {
                    "reviews_count": 0,
                    "actions_count": 0,
                    "escalations_count": 0,
                    "reports_count": 0,
                },
            }

        with ThreadPoolExecutor(
            max_workers=5
        ) as executor:

            reviews_future = (
                executor.submit(
                    self.review_service
                    .get_reviews_by_project,
                    project_id,
                )
            )

            actions_future = (
                executor.submit(
                    self.action_repository
                    .get_open_actions_by_project,
                    project_id,
                )
            )

            exceptions_future = (
                executor.submit(
                    self.action_repository
                    .get_exceptions_by_project,
                    project_id,
                )
            )

            activities_future = (
                executor.submit(
                    WorkspaceActivityRepository
                    .get_project_activity,
                    project_id,
                )
            )

            reports_future = (
                executor.submit(
                    self.report_repository
                    .get_reports_by_project,
                    project_id,
                )
            )

            reviews = (
                reviews_future.result()
                or []
            )

            actions = (
                actions_future.result()
                or []
            )

            exceptions = (
                exceptions_future.result()
                or []
            )

            activities = (
                activities_future.result()
                or []
            )

            reports = (
                reports_future.result()
                or []
            )

        insights = (
            ProjectInsightsService
            .generate_project_insights(
                project_id,
                reviews=reviews,
                actions=actions,
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

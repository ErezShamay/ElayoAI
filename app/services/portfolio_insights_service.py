from concurrent.futures import (
    ThreadPoolExecutor,
    as_completed,
)

from app.repositories.project_repository import (
    ProjectRepository
)

from app.services.project_workspace_service import (
    ProjectWorkspaceService
)

from app.services.predictive_risk_service import (
    PredictiveRiskService
)


class PortfolioInsightsService:

    def __init__(
        self,
        project_repository: ProjectRepository | None = None,
        workspace_service: ProjectWorkspaceService | None = None,
    ):

        self.project_repository = (
            project_repository or ProjectRepository()
        )

        self.workspace_service = (
            workspace_service or ProjectWorkspaceService()
        )

    def _build_portfolio_item(
        self,
        project: dict,
    ) -> dict:

        workspace = (
            self.workspace_service
            .get_workspace(
                project["id"]
            )
        )

        health = (
            workspace["health"]
        )

        summary = (
            workspace["summary"]
        )

        prediction = (
            PredictiveRiskService
            .predict_project_risk(
                workspace
            )
        )

        return {
            "project_id":
                project["id"],
            "project_name":
                project[
                    "project_name"
                ],
            "health":
                health,
            "summary":
                summary,
            "prediction":
                prediction,
        }

    def generate_portfolio_summary(
        self,
    ):

        projects = (
            self.project_repository
            .get_all_projects()
        )

        portfolio = []

        critical_projects = 0

        total_actions = 0

        total_escalations = 0

        average_health_score = 0

        with ThreadPoolExecutor(
            max_workers=5
        ) as executor:

            futures = {
                executor.submit(
                    self._build_portfolio_item,
                    project,
                ): project
                for project in projects
            }

            for future in as_completed(futures):
                item = future.result()

                health = item["health"]
                summary = item["summary"]

                if (
                    health["status"]
                    == "CRITICAL"
                ):
                    critical_projects += 1

                total_actions += (
                    summary[
                        "actions_count"
                    ]
                )

                total_escalations += (
                    summary[
                        "escalations_count"
                    ]
                )

                average_health_score += (
                    health["score"]
                )

                portfolio.append(item)

        portfolio.sort(

            key=lambda p:
                p["health"]["score"]
        )

        avg_health = 0

        if len(projects) > 0:

            avg_health = int(
                average_health_score
                / len(projects)
            )

        return {

            "projects":
                portfolio,

            "critical_projects":
                critical_projects,

            "total_projects":
                len(projects),

            "total_actions":
                total_actions,

            "total_escalations":
                total_escalations,

            "average_health_score":
                avg_health,
        }

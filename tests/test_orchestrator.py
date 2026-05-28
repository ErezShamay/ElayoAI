from app.agent.orchestrator import Orchestrator
import pytest

from app.repositories.project_repository import ProjectRepository
from app.services.approval_service import ApprovalService


@pytest.fixture(autouse=True)
def stub_project_repository(monkeypatch):
    projects = [
        {
            "id": "p1",
            "project_name": "מגדלי הצפון",
            "supervisor_name": "יוסי כהן",
            "supervisor_email": "yossi@example.com",
            "status": "ACTIVE",
        },
        {
            "id": "p2",
            "project_name": "פארק הים",
            "supervisor_name": "דנה לוי",
            "supervisor_email": "dana@example.com",
            "status": "ACTIVE",
        },
        {
            "id": "p3",
            "project_name": "גני השרון",
            "supervisor_name": "אלון פרץ",
            "supervisor_email": "alon@example.com",
            "status": "ACTIVE",
        },
    ]

    def fake_get_all_projects(self):
        return list(projects)

    def fake_find_by_name(self, project_name: str):
        query = project_name.strip()
        return [item for item in projects if query in item["project_name"]]

    monkeypatch.setattr(ProjectRepository, "get_all_projects", fake_get_all_projects)
    monkeypatch.setattr(ProjectRepository, "find_by_name", fake_find_by_name)
    monkeypatch.setattr(
        ApprovalService,
        "create_request",
        lambda self, workflow_type, payload: {
            "id": "approval-1",
            "workflow_type": workflow_type,
            "payload": payload,
            "status": "PENDING",
        },
    )


def test_check_missing_reports_workflow():
    orchestrator = Orchestrator()

    result = orchestrator.run("בדוק איזה פרויקטים חסרים דוח השבוע")

    assert result["status"] == "SUCCESS"
    assert len(result["missing_projects"]) >= 1

    project_names = [
        project["project_name"]
        for project
        in result["missing_projects"]
    ]

    assert "גני השרון" in project_names


def test_send_reminders_waiting_for_confirmation():
    orchestrator = Orchestrator()

    result = orchestrator.run(
        "בדוק איזה פרויקטים חסרים דוח השבוע ושלח תזכורת למפקחים"
    )

    assert result["status"] == "WAITING_FOR_CONFIRMATION"
    assert result["confirmation_required"] is True
    assert "run_id" in result


def test_find_report_workflow():
    orchestrator = Orchestrator()

    result = orchestrator.run(
        "מצא לי את הדוח האחרון של פרויקט מגדלי צפון"
    )

    assert result["status"] == "SUCCESS"
    assert result["project"]["project_name"] == "מגדלי הצפון"


def test_summary_workflow():
    orchestrator = Orchestrator()

    result = orchestrator.run(
        "סכם לי את הסטטוס של פרויקט מגדלי הצפון"
    )

    assert result["status"] == "SUCCESS"
    assert result["project"]["project_name"] == "מגדלי הצפון"

def test_llm_fallback_find_report_workflow():
    orchestrator = Orchestrator()

    result = orchestrator.run(
        "אני צריך את הדוח של פרויקט מגדלי הצפון"
    )

    assert result["status"] == "SUCCESS"
    assert result["project"]["project_name"] == "מגדלי הצפון"
    assert result["intent_result"]["source"] == "LLM_MOCK"

def test_llm_entity_extraction_fallback():
    orchestrator = Orchestrator()

    result = orchestrator.run(
        "אני צריך את הדוח של מגדלי הצפון"
    )

    assert result["status"] == "SUCCESS"
    assert result["project"]["project_name"] == "מגדלי הצפון"
    assert result["intent_result"]["source"] == "LLM_MOCK"

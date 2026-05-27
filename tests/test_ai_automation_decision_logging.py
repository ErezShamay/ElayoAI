from app.services.ai_automation_service import (
    AIAutomationService
)


class FakeConfidenceService:

    def __init__(
        self,
        confidence,
    ):

        self.confidence = confidence

    def calculate_confidence(
        self,
        health,
        risk_analysis,
    ):

        return self.confidence


class FakeAutomationNotifications:

    def __init__(
        self,
    ):

        self.activities = []

    def create_automation_activity(
        self,
        **payload,
    ):

        self.activities.append(
            payload
        )


def build_service_with_log_capture():

    service = (
        AIAutomationService.__new__(
            AIAutomationService
        )
    )

    logs = []

    service.log_ai_execution = (
        lambda **payload: logs.append(
            payload
        )
    )

    return service, logs


def test_process_project_logs_missing_project_id_skip():

    service, logs = (
        build_service_with_log_capture()
    )

    service.process_project(
        {
            "project_name":
                "Missing ID Project"
        }
    )

    assert logs[0]["execution_type"] == "PROJECT_PROCESSING_SKIPPED"
    assert logs[0]["status"] == "SKIPPED"
    assert logs[0]["details"]["reason"] == "missing_project_id"


def test_evaluate_operational_health_logs_no_action_decision():

    service, logs = (
        build_service_with_log_capture()
    )

    service.ai_confidence_service = FakeConfidenceService(
        {
            "score":
                90,
            "confidence_level":
                "HIGH",
        }
    )

    service.create_critical_project_activity = (
        lambda **payload: logs.append(
            {
                "execution_type":
                    "UNEXPECTED_CRITICAL_ACTIVITY"
            }
        )
    )

    service.evaluate_operational_health(

        project={
            "id":
                "project-1",
            "project_name":
                "Healthy Project",
        },

        health={
            "status":
                "GOOD",
            "score":
                92,
        },

        risk_analysis={
            "risk_level":
                "LOW"
        },
    )

    execution_types = [
        log["execution_type"]
        for log
        in logs
    ]

    assert execution_types == [
        "RISK_EVALUATION",
        "AI_DECISION",
    ]

    assert logs[1]["status"] == "NO_ACTION_NEEDED"
    assert logs[1]["details"]["decision"] == "NO_ACTION_NEEDED"


def test_create_critical_project_activity_logs_auto_execution_approval():

    service, logs = (
        build_service_with_log_capture()
    )

    service.automation_notifications = (
        FakeAutomationNotifications()
    )

    created_actions = []

    service.create_ai_operational_action = (
        lambda **payload: created_actions.append(
            payload
        )
    )

    service.create_critical_project_activity(

        project={
            "id":
                "project-1",
            "project_name":
                "Risky Project",
        },

        health={
            "score":
                24
        },

        risk_analysis={
            "risk_level":
                "HIGH"
        },

        confidence={
            "score":
                82,
            "confidence_level":
                "HIGH",
        },
    )

    assert logs[0]["execution_type"] == "AUTO_EXECUTION_APPROVED"
    assert logs[0]["status"] == "SUCCESS"
    assert logs[0]["details"]["decision"] == "AUTO_EXECUTE"
    assert len(created_actions) == 1


def test_create_critical_project_activity_logs_low_confidence_skip():

    service, logs = (
        build_service_with_log_capture()
    )

    service.automation_notifications = (
        FakeAutomationNotifications()
    )

    created_actions = []

    service.create_ai_operational_action = (
        lambda **payload: created_actions.append(
            payload
        )
    )

    service.create_critical_project_activity(

        project={
            "id":
                "project-1",
            "project_name":
                "Risky Project",
        },

        health={
            "score":
                24
        },

        risk_analysis={
            "risk_level":
                "HIGH"
        },

        confidence={
            "score":
                62,
            "confidence_level":
                "MEDIUM",
        },
    )

    assert logs[0]["execution_type"] == "AUTO_EXECUTION_SKIPPED"
    assert logs[0]["status"] == "LOW_CONFIDENCE"
    assert created_actions == []


def test_log_ai_assignment_decision_records_skipped_and_success():

    service, logs = (
        build_service_with_log_capture()
    )

    project = {
        "id":
            "project-1"
    }

    service.log_ai_assignment_decision(
        project,
        None,
    )

    service.log_ai_assignment_decision(

        project,

        {
            "id":
                "profile-1",
            "full_name":
                "Demo User",
        },
    )

    assert logs[0]["execution_type"] == "AI_ASSIGNMENT_DECISION"
    assert logs[0]["status"] == "SKIPPED"
    assert logs[0]["details"]["decision"] == "NO_ASSIGNEE"

    assert logs[1]["execution_type"] == "AI_ASSIGNMENT_DECISION"
    assert logs[1]["status"] == "SUCCESS"
    assert logs[1]["details"]["assigned_to"] == "profile-1"

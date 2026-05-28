from datetime import datetime

from app.repositories.ai_interpretation_repository import (
    AIInterpretationRepository,
)
from app.services.ai_review_service import (
    AIReviewService,
)


class FakeQuery:
    def __init__(self, table_data: dict[str, list[dict]], table_name: str):
        self._table_data = table_data
        self._table_name = table_name
        self._selected = False
        self._filters: list[tuple[str, object]] = []
        self._limit: int | None = None
        self._update_payload: dict | None = None
        self._insert_payload: dict | None = None

    def select(self, _value):
        self._selected = True
        return self

    def eq(self, key, value):
        self._filters.append((key, value))
        return self

    def limit(self, count):
        self._limit = count
        return self

    def update(self, payload):
        self._update_payload = payload
        return self

    def insert(self, payload):
        self._insert_payload = payload
        return self

    def execute(self):
        rows = list(self._table_data.get(self._table_name, []))

        for key, value in self._filters:
            rows = [row for row in rows if row.get(key) == value]

        if self._insert_payload is not None:
            created = dict(self._insert_payload)
            created.setdefault("id", "generated-id")
            self._table_data.setdefault(self._table_name, []).append(created)
            return type("Response", (), {"data": [created]})()

        if self._update_payload is not None:
            updated_rows: list[dict] = []
            for item in self._table_data.get(self._table_name, []):
                matches = all(item.get(key) == value for key, value in self._filters)
                if not matches:
                    continue
                item.update(self._update_payload)
                updated_rows.append(dict(item))
            return type("Response", (), {"data": updated_rows})()

        if self._limit is not None:
            rows = rows[: self._limit]

        return type("Response", (), {"data": rows})()


class FakeClient:
    def __init__(self, table_data: dict[str, list[dict]]):
        self._table_data = table_data

    def table(self, table_name):
        return FakeQuery(self._table_data, table_name)


def build_repository(seed_data: dict[str, list[dict]]) -> AIInterpretationRepository:
    repository = AIInterpretationRepository.__new__(AIInterpretationRepository)
    repository.client = FakeClient(seed_data)
    repository.table_name = "ai_interpretations"
    return repository


def test_review_repository_can_approve_interpretation():
    repository = build_repository(
        {
            "ai_interpretations": [
                {
                    "id": "ai-1",
                    "review_status": "PENDING",
                    "recommended_action": "Call supervisor",
                    "business_impact": "Timeline risk",
                }
            ]
        }
    )

    approved = repository.approve_interpretation(
        interpretation_id="ai-1",
        reviewed_by="qa-user",
        review_notes="Approved for escalation",
    )

    assert approved is not None
    assert approved["review_status"] == "APPROVED"
    assert approved["reviewed_by"] == "qa-user"
    assert approved["review_notes"] == "Approved for escalation"
    assert datetime.fromisoformat(approved["reviewed_at"]) is not None


def test_review_repository_returns_none_when_approving_missing_row():
    repository = build_repository({"ai_interpretations": []})

    approved = repository.approve_interpretation(
        interpretation_id="missing",
        reviewed_by="qa-user",
    )

    assert approved is None


def test_review_repository_assigns_reviewer():
    repository = build_repository(
        {
            "ai_interpretations": [
                {
                    "id": "ai-1",
                    "review_status": "PENDING",
                    "assigned_reviewer": None,
                }
            ]
        }
    )

    assigned = repository.assign_reviewer(
        interpretation_id="ai-1",
        reviewer_id="reviewer-7",
    )

    assert assigned is not None
    assert assigned["assigned_reviewer"] == "reviewer-7"


def test_review_repository_tracks_human_override():
    repository = build_repository(
        {
            "ai_interpretations": [
                {
                    "id": "ai-1",
                    "review_status": "PENDING",
                }
            ]
        }
    )

    overridden = repository.apply_human_override(
        interpretation_id="ai-1",
        overridden_by="team-lead",
        override_reason="False positive after manual validation",
    )

    assert overridden is not None
    assert overridden["review_status"] == "OVERRIDDEN"
    assert overridden["overridden_by"] == "team-lead"
    assert "overridden_at" in overridden


def test_review_repository_recommendation_review():
    repository = build_repository(
        {
            "ai_interpretations": [
                {
                    "id": "ai-1",
                    "review_status": "PENDING",
                }
            ]
        }
    )

    reviewed = repository.review_recommendation(
        interpretation_id="ai-1",
        decision="APPROVED",
        reviewed_by="reviewer-1",
        review_notes="Recommendation accepted",
    )

    assert reviewed is not None
    assert reviewed["recommendation_review_status"] == "APPROVED"
    assert reviewed["recommendation_reviewed_by"] == "reviewer-1"
    assert "recommendation_reviewed_at" in reviewed


def test_ai_review_service_approve_flow_creates_action():
    class FakeInterpretationRepository:
        def approve_interpretation(self, interpretation_id: str, reviewed_by: str, review_notes: str):
            return {
                "id": interpretation_id,
                "recommended_action": "Escalate to operations",
                "business_impact": "High business impact",
                "reviewed_by": reviewed_by,
                "review_notes": review_notes,
                "review_status": "APPROVED",
            }

    class FakeOperationalActionRepository:
        def create_action(self, action):
            return {
                "id": "act-1",
                "title": action.title,
                "description": action.description,
                "status": action.status,
                "action_type": action.action_type,
                "interpretation_id": action.interpretation_id,
            }

    service = AIReviewService.__new__(AIReviewService)
    service.repository = FakeInterpretationRepository()
    service.operational_repository = FakeOperationalActionRepository()

    payload = service.approve_review(
        interpretation_id="ai-1",
        reviewed_by="reviewer-1",
        review_notes="Looks correct",
    )

    assert payload["approved_interpretation"]["review_status"] == "APPROVED"
    assert payload["created_action"]["action_type"] == "ESCALATION"
    assert payload["created_action"]["title"] == "Escalate to operations"

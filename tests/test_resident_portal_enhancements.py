from unittest.mock import MagicMock, patch

from app.schemas.project_apartment import (
    ResidentPortalProgressItem,
    ResidentPortalReportLine,
)
from app.schemas.quality_issue import IssueVisibility, QualityIssueSeverity, QualityIssueStatus
from app.services.resident_activation_service import ResidentActivationService
from app.services.resident_portal_status_cards import build_status_cards
from app.services.resident_portal_gantt import build_gantt_rows
from app.services.resident_portal_matching import (
    record_matches_apartment,
    text_matches_apartment,
)


def test_text_matches_apartment_hebrew():
    assert text_matches_apartment("ממצא בדירה 12 בחדר רחצה", "12") is True
    assert text_matches_apartment("לובי בניין", "12") is False


def test_record_matches_apartment_metadata():
    finding = {
        "title": "General",
        "summary": "",
        "metadata": {"location": "דירה 5"},
    }
    assert record_matches_apartment(finding, "5") is True


def test_build_gantt_rows_groups_progress_and_inspections():
    rows = build_gantt_rows(
        progress_timeline=[
            ResidentPortalProgressItem(
                description="איטום חדרים רטובים",
                status="בתהליך",
                completion_date="",
                report_id="r1",
                visit_date="2026-03-01",
                report_title="דוח גמר",
            ),
            ResidentPortalProgressItem(
                description="איטום חדרים רטובים",
                status="בוצע",
                completion_date="2026-04-10",
                report_id="r2",
                visit_date="2026-04-10",
                report_title="דוח גמר 2",
            ),
        ],
        report_lines=[
            ResidentPortalReportLine(
                id="line-1",
                report_id="r1",
                description="בדיקת ריצוף",
                status="נבדק",
                visit_date="2026-03-15",
                report_title="דוח גמר",
            )
        ],
    )

    assert len(rows) == 2
    assert rows[0].label == "איטום חדרים רטובים"
    assert rows[0].status == "בוצע"
    assert rows[1].label == "בדיקות מפקח בדירה"
    assert any(item.kind == "inspection" for item in rows[1].milestones)


def test_build_status_cards_green_when_all_closed():
    cards = build_status_cards(
        [
            {
                "catalog_issue_id": "ROOFS_AND_BALCONIES-001",
                "title": "איטום מרפסת",
                "status": QualityIssueStatus.CLOSED.value,
                "severity": QualityIssueSeverity.HIGH.value,
            },
            {
                "catalog_issue_id": "REINFORCEMENT_STEEL-001",
                "title": "שלד",
                "status": QualityIssueStatus.CLOSED.value,
                "severity": QualityIssueSeverity.MEDIUM.value,
            },
        ]
    )

    assert len(cards) == 2
    assert all(card.level == "green" for card in cards)


def test_build_status_cards_red_for_critical_open():
    cards = build_status_cards(
        [
            {
                "catalog_issue_id": "ROOFS_AND_BALCONIES-001",
                "title": "איטום מרפסת",
                "status": QualityIssueStatus.OPEN.value,
                "severity": QualityIssueSeverity.CRITICAL.value,
            }
        ]
    )

    sealing = next(card for card in cards if card.card_key == "sealing")
    assert sealing.level == "red"
    assert sealing.critical_open_count == 1


def test_build_status_cards_yellow_for_open_remediation():
    cards = build_status_cards(
        [
            {
                "trade": "שלד",
                "title": "סדק בקיר",
                "status": QualityIssueStatus.IN_REMEDIATION.value,
                "severity": QualityIssueSeverity.MEDIUM.value,
            }
        ]
    )

    structure = next(card for card in cards if card.card_key == "structure")
    assert structure.level == "yellow"
    assert structure.open_count == 1


def test_resident_activation_on_login():
    repository = MagicMock()
    repository.activate_resident_by_profile_id.return_value = True
    service = ResidentActivationService(apartment_repository=repository)

    activated = service.activate_on_login(
        profile_id="user-1",
        role="RESIDENT",
    )

    assert activated is True
    repository.activate_resident_by_profile_id.assert_called_once_with("user-1")


def test_resident_activation_skips_non_resident():
    repository = MagicMock()
    service = ResidentActivationService(apartment_repository=repository)

    assert service.activate_on_login(profile_id="user-1", role="SUPERVISOR") is False
    repository.activate_resident_by_profile_id.assert_not_called()


@patch("app.services.resident_portal_service.supabase")
def test_collect_legacy_weekly_reports_filters_by_apartment(mock_supabase):
    from app.services.resident_portal_service import ResidentPortalService

    weekly_table = MagicMock()
    reports_table = MagicMock()
    findings_table = MagicMock()

    def table_router(name: str):
        if name == "weekly_reports":
            return weekly_table
        if name == "reports":
            return reports_table
        if name == "findings":
            return findings_table
        raise AssertionError(f"unexpected table {name}")

    mock_supabase.table.side_effect = table_router

    weekly_table.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "wr-1",
                "email_subject": "דוח שבועי דירה 7",
                "created_at": "2026-01-01",
            }
        ]
    )
    reports_table.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(
        data=[]
    )
    findings_table.select.return_value.eq.return_value.execute.return_value = MagicMock(
        data=[
            {
                "id": "f-1",
                "report_id": "wr-1",
                "project_id": "proj-1",
                "title": "ליקוי בדירה 7",
                "summary": "סדק בקיר",
                "status": "detected",
            }
        ]
    )

    service = ResidentPortalService()
    summaries, lines = service._collect_legacy_weekly_reports(
        project_id="proj-1",
        apartment_number="7",
    )

    assert len(summaries) == 1
    assert summaries[0].source == "weekly"
    assert len(lines) == 1
    assert lines[0].source == "weekly"

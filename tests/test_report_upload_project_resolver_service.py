from pathlib import Path

from app.services.report_upload_project_resolver_service import (
    ReportUploadProjectResolverService,
    _extract_candidate_project_name,
)


class FakeTextExtractionService:
    def __init__(self, text: str):
        self.text = text

    def extract_text(self, file_path: str) -> str:
        return self.text


class FakeProjectRepository:
    def __init__(self, projects: list[dict]):
        self.projects = projects

    def get_projects_by_organization(self, organization_id: str):
        return [
            project
            for project in self.projects
            if project.get("organization_id") == organization_id
        ]


def _build_service(
    *,
    projects: list[dict],
    extracted_text: str,
) -> ReportUploadProjectResolverService:
    tenant_scope_service = ReportUploadProjectResolverService().tenant_scope_service
    tenant_scope_service.project_repository = FakeProjectRepository(projects)
    return ReportUploadProjectResolverService(
        tenant_scope_service=tenant_scope_service,
        text_extraction_service=FakeTextExtractionService(extracted_text),
    )


def test_resolve_from_upload_exact_match(tmp_path: Path):
    file_path = tmp_path / "report.pdf"
    file_path.write_bytes(b"%PDF")

    service = _build_service(
        projects=[
            {
                "id": "p1",
                "project_name": "מגדלי הצפון",
                "organization_id": "org-1",
            }
        ],
        extracted_text="דוח ביקור הנדסי\nמגדלי הצפון\nתאריך ביקור באתר: 01/03/2026",
    )

    result = service.resolve_from_upload(
        file_path=str(file_path),
        filename="report.pdf",
        organization_id="org-1",
    )

    assert result["match_status"] == "EXACT_MATCH"
    assert result["project"]["id"] == "p1"
    assert result["extracted_project_name"] == "מגדלי הצפון"


def test_resolve_from_upload_not_found_with_candidate(tmp_path: Path):
    file_path = tmp_path / "report.pdf"
    file_path.write_bytes(b"%PDF")

    service = _build_service(
        projects=[
            {
                "id": "p1",
                "project_name": "פרויקט אחר",
                "organization_id": "org-1",
            }
        ],
        extracted_text="דוח ביקור הנדסי\nשכונת הדקלים\nתאריך ביקור באתר: 01/03/2026",
    )

    result = service.resolve_from_upload(
        file_path=str(file_path),
        filename="report.pdf",
        organization_id="org-1",
    )

    assert result["match_status"] == "NOT_FOUND"
    assert result["project"] is None
    assert result["extracted_project_name"] == "שכונת הדקלים"


def test_resolve_from_upload_multiple_matches(tmp_path: Path):
    file_path = tmp_path / "report.pdf"
    file_path.write_bytes(b"%PDF")

    service = _build_service(
        projects=[
            {
                "id": "p1",
                "project_name": "מגדלי הצפון",
                "organization_id": "org-1",
            },
            {
                "id": "p2",
                "project_name": "מגדלי הצפון - שלב ב",
                "organization_id": "org-1",
            },
        ],
        extracted_text="דוח על מגדלי הצפון - שלב ב ומגדלי הצפון",
    )

    result = service.resolve_from_upload(
        file_path=str(file_path),
        filename="report.pdf",
        organization_id="org-1",
    )

    assert result["match_status"] == "MULTIPLE_MATCHES"
    assert len(result["projects"]) == 2


def test_extract_candidate_project_name_skips_labels():
    candidate = _extract_candidate_project_name(
        extracted_text=(
            "דוח ביקור הנדסי\n"
            "תאריך ביקור באתר: 01/03/2026\n"
            "פרויקט חדש לדוגמה"
        ),
        filename="weekly.pdf",
        known_project_names={"פרויקט קיים"},
    )

    assert candidate == "פרויקט חדש לדוגמה"

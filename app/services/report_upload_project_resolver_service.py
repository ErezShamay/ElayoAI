from __future__ import annotations

import re
from pathlib import Path

from app.services.report_text_extraction_service import ReportTextExtractionService
from app.services.tenant_scope_service import TenantScopeService

_SKIP_LINE_PREFIXES = (
    "תאריך התחלת הפרויקט:",
    "תאריך סיום הפרויקט",
    "תאריך ביקור באתר:",
    "צפי לוחות זמנים",
    "שינויי דיירים:",
    "לכבוד:",
    "פרטים כללים:",
    "עדכונים לפרויקט:",
    "ספקים עיקריים",
)

_SKIP_LINE_EXACT = {
    "דוח ביקור הנדסי",
    "פיקוח בניה הנדסי",
    "פיקוח בנייה הנדסי",
}


def _normalize_match_text(value: str) -> str:
    collapsed = re.sub(r"\s+", " ", value.strip())
    return collapsed.casefold()


def _is_skipped_cover_line(line: str) -> bool:
    trimmed = line.strip()
    if not trimmed:
        return True
    if trimmed in _SKIP_LINE_EXACT:
        return True
    return any(trimmed.startswith(prefix) for prefix in _SKIP_LINE_PREFIXES)


def _extract_candidate_project_name(
    extracted_text: str,
    filename: str,
    known_project_names: set[str],
) -> str | None:
    normalized_known = {
        _normalize_match_text(name) for name in known_project_names if name.strip()
    }

    for line in extracted_text.splitlines():
        candidate = line.strip()
        if _is_skipped_cover_line(candidate):
            continue
        if len(candidate) < 2:
            continue
        if _normalize_match_text(candidate) in normalized_known:
            continue
        if re.fullmatch(r"[\d\W]+", candidate):
            continue
        return candidate

    stem = Path(filename).stem.strip()
    if stem and _normalize_match_text(stem) not in normalized_known:
        return stem

    return None


class ReportUploadProjectResolverService:
    def __init__(
        self,
        *,
        tenant_scope_service: TenantScopeService | None = None,
        text_extraction_service: ReportTextExtractionService | None = None,
    ):
        self.tenant_scope_service = tenant_scope_service or TenantScopeService()
        self.text_extraction_service = (
            text_extraction_service or ReportTextExtractionService()
        )

    def resolve_from_upload(
        self,
        *,
        file_path: str,
        filename: str,
        organization_id: str,
        role: str | None = None,
        actor_user_id: str | None = None,
    ) -> dict:
        projects = self._scoped_projects(
            organization_id=organization_id,
            role=role,
            actor_user_id=actor_user_id,
        )
        extracted_text = self.text_extraction_service.extract_text(file_path)
        normalized_text = _normalize_match_text(extracted_text)

        matched_projects: list[dict] = []
        for project in sorted(
            projects,
            key=lambda item: len(str(item.get("project_name") or "")),
            reverse=True,
        ):
            project_name = str(project.get("project_name") or "").strip()
            if not project_name:
                continue
            if _normalize_match_text(project_name) in normalized_text:
                matched_projects.append(project)

        if len(matched_projects) == 1:
            project = matched_projects[0]
            return {
                "match_status": "EXACT_MATCH",
                "extracted_project_name": project.get("project_name"),
                "project": self._public_project(project),
                "projects": [],
            }

        if len(matched_projects) > 1:
            return {
                "match_status": "MULTIPLE_MATCHES",
                "extracted_project_name": matched_projects[0].get("project_name"),
                "project": self._public_project(matched_projects[0]),
                "projects": [
                    self._public_project(item) for item in matched_projects
                ],
            }

        known_names = {
            str(project.get("project_name") or "").strip()
            for project in projects
            if str(project.get("project_name") or "").strip()
        }
        candidate = _extract_candidate_project_name(
            extracted_text=extracted_text,
            filename=filename,
            known_project_names=known_names,
        )

        return {
            "match_status": "NOT_FOUND",
            "extracted_project_name": candidate,
            "project": None,
            "projects": [],
        }

    def _scoped_projects(
        self,
        *,
        organization_id: str,
        role: str | None,
        actor_user_id: str | None,
    ) -> list[dict]:
        projects = self.tenant_scope_service.project_repository.get_projects_by_organization(
            organization_id
        )
        return self.tenant_scope_service.filter_actor_projects(
            projects,
            role=role,
            actor_user_id=actor_user_id,
        )

    @staticmethod
    def _public_project(project: dict) -> dict:
        return {
            "id": project.get("id"),
            "project_name": project.get("project_name"),
        }

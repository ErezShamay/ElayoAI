from __future__ import annotations

from app.auth.roles import normalize_role

SUPERVISOR_ROLE = "SUPERVISOR"


def should_scope_projects_to_supervisor(role: str | None) -> bool:
    return normalize_role(role) == SUPERVISOR_ROLE


def normalize_supervisor_email(email: str | None) -> str:
    return (email or "").strip().lower()


def project_supervised_by(
    project: dict,
    supervisor_email: str | None,
) -> bool:
    project_email = normalize_supervisor_email(
        project.get("supervisor_email")
    )
    user_email = normalize_supervisor_email(supervisor_email)
    if not project_email or not user_email:
        return False
    return project_email == user_email


def filter_supervised_projects(
    projects: list[dict],
    *,
    role: str | None,
    supervisor_email: str | None,
) -> list[dict]:
    if not should_scope_projects_to_supervisor(role):
        return projects
    return [
        project
        for project in projects
        if project_supervised_by(project, supervisor_email)
    ]


def supervised_project_ids(
    projects: list[dict],
    *,
    role: str | None,
    supervisor_email: str | None,
) -> set[str]:
    scoped = filter_supervised_projects(
        projects,
        role=role,
        supervisor_email=supervisor_email,
    )
    return {
        str(project.get("id") or "")
        for project in scoped
        if project.get("id")
    }


def resolve_supervisor_email(
    profile_repository,
    actor_user_id: str,
) -> str | None:
    profile = profile_repository.get_profile_by_id(actor_user_id)
    if not profile:
        return None
    email = profile.get("email")
    if not isinstance(email, str):
        return None
    trimmed = email.strip()
    return trimmed or None

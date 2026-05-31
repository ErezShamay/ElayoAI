from __future__ import annotations

PLATFORM_ADMIN_ROLE = "PLATFORM_ADMIN"
ORG_ADMIN_ROLE = "ADMIN"

USER_MANAGEMENT_ROLES = (
    PLATFORM_ADMIN_ROLE,
    ORG_ADMIN_ROLE,
)

ORG_SCOPED_INVITE_ROLES = (
    ORG_ADMIN_ROLE,
    "SUPERVISOR",
    "VIEWER",
)

CLIENT_ADMIN_INVITE_ROLES = (
    "SUPERVISOR",
    "VIEWER",
)

PLATFORM_INVITE_ROLES = ORG_SCOPED_INVITE_ROLES


def normalize_role(role: str | None) -> str:
    return (role or "").strip().upper()


def is_platform_admin(role: str | None) -> bool:
    return normalize_role(role) == PLATFORM_ADMIN_ROLE


def is_org_admin(role: str | None) -> bool:
    return normalize_role(role) == ORG_ADMIN_ROLE


def can_manage_users(role: str | None) -> bool:
    return normalize_role(role) in set(USER_MANAGEMENT_ROLES)


def inviteable_roles(actor_role: str | None) -> tuple[str, ...]:
    if is_platform_admin(actor_role):
        return PLATFORM_INVITE_ROLES
    if is_org_admin(actor_role):
        return CLIENT_ADMIN_INVITE_ROLES
    return ()


def can_assign_role(
    *,
    actor_role: str | None,
    target_role: str | None,
) -> bool:
    return normalize_role(target_role) in set(
        inviteable_roles(actor_role)
    )

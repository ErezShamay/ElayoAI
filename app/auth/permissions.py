from __future__ import annotations

PERMISSION_MATRIX: dict[str, set[str]] = {
    "PLATFORM_ADMIN": {
        "projects:read",
        "projects:write",
        "reports:read",
        "reports:write",
        "users:read",
        "users:write",
        "organizations:read",
        "organizations:write",
        "audit:read",
        "impersonation:use",
    },
    "ADMIN": {
        "projects:read",
        "projects:write",
        "reports:read",
        "reports:write",
        "users:read",
        "users:write",
        "audit:read",
    },
    "MANAGER": {
        "projects:read",
        "projects:write",
        "reports:read",
        "reports:write",
        "users:read",
        "audit:read",
    },
    "ANALYST": {
        "projects:read",
        "reports:read",
    },
    "VIEWER": {
        "projects:read",
        "reports:read",
    },
}


def resolve_permissions(role: str) -> set[str]:
    return set(PERMISSION_MATRIX.get(role.upper(), set()))

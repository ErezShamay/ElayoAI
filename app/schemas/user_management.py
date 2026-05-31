from pydantic import BaseModel, Field

from app.auth.roles import (
    ORG_SCOPED_INVITE_ROLES,
    PLATFORM_INVITE_ROLES,
)

ALLOWED_USER_ROLES = PLATFORM_INVITE_ROLES
ORG_ADMIN_INVITE_ROLES = ORG_SCOPED_INVITE_ROLES


class UserInviteRequest(BaseModel):
    email: str = Field(..., min_length=3, max_length=320)
    full_name: str = Field(..., min_length=1, max_length=120)
    role: str = Field(default="VIEWER")


class ManagedUser(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    role: str
    created_at: str | None = None

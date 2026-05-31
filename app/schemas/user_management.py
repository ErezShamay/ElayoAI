from pydantic import BaseModel, Field


ALLOWED_USER_ROLES = (
    "ADMIN",
    "MANAGER",
    "ANALYST",
    "VIEWER",
)


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

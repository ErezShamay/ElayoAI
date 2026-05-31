from pydantic import BaseModel, Field


class OrganizationCreateRequest(BaseModel):
    organization_name: str = Field(..., min_length=1, max_length=200)
    contact_email: str = Field(..., min_length=3, max_length=320)

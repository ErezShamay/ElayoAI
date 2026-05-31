from uuid import uuid4

from postgrest.exceptions import APIError

from app.db.supabase_client import (
    supabase
)


class OrganizationRepository:

    def __init__(self):

        self.client = supabase

    def get_first_organization(self):

        response = (
            self.client
            .table("organizations")
            .select("id")
            .limit(1)
            .execute()
        )

        if not response.data:
            return None

        return response.data[0]

    def create_organization(
        self,
        name: str = "Default Organization",
    ):

        org_id = str(uuid4())
        payloads = [
            {
                "id": org_id,
                "organization_name": name,
                "contact_email": "demo@example.com",
                "status": "ACTIVE",
            },
            {
                "id": org_id,
                "organization_name": name,
            },
            {
                "id": org_id,
                "name": name,
            },
        ]

        last_error = None

        for payload in payloads:
            try:
                response = (
                    self.client
                    .table("organizations")
                    .insert(payload)
                    .execute()
                )
                return response.data[0]
            except APIError as error:
                last_error = error

        if last_error:
            raise last_error

        raise RuntimeError("Failed creating organization")

    def get_all_organizations(self):

        organizations_response = (
            self.client
            .table("organizations")
            .select("*")
            .execute()
        )

        organizations = (
            organizations_response.data
        )

        for organization in organizations:

            projects_response = (
                self.client
                .table("projects")
                .select("*")
                .eq(
                    "organization_id",
                    organization["id"]
                )
                .execute()
            )

            organization["projects"] = (
                projects_response.data
            )

        return organizations
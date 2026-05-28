from datetime import datetime
from datetime import timezone


class WorkflowVersioningService:
    def __init__(self):
        self._versions: dict[str, list[dict]] = {}
        self._active_versions: dict[str, int] = {}

    def create_version(
        self,
        workflow_name: str,
        definition: dict,
        published_by: str,
        activate: bool = True,
    ):
        versions = self._versions.setdefault(workflow_name, [])
        version_number = len(versions) + 1
        payload = {
            "workflow_name": workflow_name,
            "version": version_number,
            "definition": definition,
            "published_by": published_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        versions.append(payload)
        if activate:
            self._active_versions[workflow_name] = version_number
        payload["is_active"] = self._active_versions.get(workflow_name) == version_number
        return payload

    def list_versions(
        self,
        workflow_name: str,
    ):
        versions = self._versions.get(workflow_name, [])
        active = self._active_versions.get(workflow_name)
        return [
            {
                **item,
                "is_active": item["version"] == active,
            }
            for item in versions
        ]

    def get_active_version(
        self,
        workflow_name: str,
    ):
        active = self._active_versions.get(workflow_name)
        if not active:
            return None
        for item in self._versions.get(workflow_name, []):
            if item["version"] == active:
                return {
                    **item,
                    "is_active": True,
                }
        return None

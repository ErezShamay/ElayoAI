from datetime import UTC, datetime
from threading import Lock


class WorkspaceActivityService:
    def __init__(self):
        self._activities_by_project: dict[str, list[dict]] = {}
        self._layouts_by_scope: dict[tuple[str, str], dict] = {}
        self._widgets_by_scope: dict[tuple[str, str], list[dict]] = {}
        self._id_counter = 0
        self._lock = Lock()

    def list_activities(
        self,
        project_id: str,
        *,
        activity_type: str | None = None,
        actor_id: str | None = None,
        search: str | None = None,
        before: str | None = None,
        limit: int = 50,
    ) -> dict:
        events = list(self._activities_by_project.get(project_id, []))

        normalized_type = (activity_type or "").strip().upper()
        normalized_actor = (actor_id or "").strip()
        normalized_search = (search or "").strip().lower()

        if normalized_type:
            events = [
                event
                for event in events
                if str(event.get("activity_type", "")).upper() == normalized_type
            ]

        if normalized_actor:
            events = [
                event for event in events if str(event.get("actor_id", "")).strip() == normalized_actor
            ]

        if normalized_search:
            events = [
                event
                for event in events
                if normalized_search in str(event.get("title", "")).lower()
                or normalized_search in str(event.get("description", "")).lower()
            ]

        if before:
            events = [event for event in events if str(event.get("created_at", "")) < before]

        events = sorted(events, key=lambda item: item.get("created_at", ""), reverse=True)
        limited = events[: max(limit, 0)]

        return {
            "project_id": project_id,
            "total": len(limited),
            "filters": {
                "activity_type": normalized_type or None,
                "actor_id": normalized_actor or None,
                "search": normalized_search or None,
                "before": before,
            },
            "activities": limited,
            "next_cursor": limited[-1]["created_at"] if limited else None,
        }

    def create_activity(
        self,
        project_id: str,
        *,
        activity_type: str,
        title: str,
        description: str | None = None,
        metadata: dict | None = None,
        actor_id: str | None = None,
    ) -> dict:
        with self._lock:
            self._id_counter += 1
            activity_id = f"ws-act-{self._id_counter}"

        activity = {
            "id": activity_id,
            "project_id": project_id,
            "activity_type": activity_type.strip().upper(),
            "title": title.strip(),
            "description": (description or "").strip() or None,
            "metadata": metadata or {},
            "actor_id": (actor_id or "").strip() or None,
            "created_at": datetime.now(UTC).isoformat(),
        }
        self._activities_by_project.setdefault(project_id, []).append(activity)
        return activity

    def list_cross_project_activities(
        self,
        project_ids: list[str],
        *,
        limit: int = 50,
    ) -> dict:
        events: list[dict] = []
        for project_id in project_ids:
            events.extend(self._activities_by_project.get(project_id, []))
        events = sorted(events, key=lambda item: item.get("created_at", ""), reverse=True)
        limited = events[: max(limit, 0)]
        return {
            "project_ids": project_ids,
            "total": len(limited),
            "activities": limited,
        }

    def save_layout(self, project_id: str, user_id: str, layout: dict) -> dict:
        key = (project_id, user_id)
        self._layouts_by_scope[key] = layout
        return {
            "project_id": project_id,
            "user_id": user_id,
            "layout": layout,
        }

    def get_layout(self, project_id: str, user_id: str) -> dict:
        key = (project_id, user_id)
        return {
            "project_id": project_id,
            "user_id": user_id,
            "layout": self._layouts_by_scope.get(key, {}),
        }

    def save_widgets(self, project_id: str, user_id: str, widgets: list[dict]) -> dict:
        key = (project_id, user_id)
        self._widgets_by_scope[key] = widgets
        return {
            "project_id": project_id,
            "user_id": user_id,
            "widgets": widgets,
            "total_widgets": len(widgets),
        }

    def get_widgets(self, project_id: str, user_id: str) -> dict:
        key = (project_id, user_id)
        widgets = self._widgets_by_scope.get(key, [])
        return {
            "project_id": project_id,
            "user_id": user_id,
            "widgets": widgets,
            "total_widgets": len(widgets),
        }

    def get_analytics(self, project_id: str) -> dict:
        events = self._activities_by_project.get(project_id, [])
        activity_type_counts: dict[str, int] = {}
        actor_counts: dict[str, int] = {}
        for event in events:
            activity_type = str(event.get("activity_type", "UNKNOWN")).upper()
            actor_id = str(event.get("actor_id") or "system")
            activity_type_counts[activity_type] = activity_type_counts.get(activity_type, 0) + 1
            actor_counts[actor_id] = actor_counts.get(actor_id, 0) + 1
        return {
            "project_id": project_id,
            "total_activities": len(events),
            "activity_type_breakdown": activity_type_counts,
            "actor_breakdown": actor_counts,
        }

    def group_activities(self, project_id: str, group_by: str = "activity_type") -> dict:
        normalized_group_by = (group_by or "").strip().lower()
        if normalized_group_by not in {"activity_type", "actor_id", "day"}:
            normalized_group_by = "activity_type"

        groups: dict[str, list[dict]] = {}
        for event in self._activities_by_project.get(project_id, []):
            if normalized_group_by == "day":
                key = str(event.get("created_at", ""))[:10]
            else:
                key = str(event.get(normalized_group_by) or "unknown")
            groups.setdefault(key, []).append(event)

        grouped = [
            {"group_key": key, "count": len(items), "activities": items}
            for key, items in sorted(groups.items(), key=lambda row: row[0], reverse=True)
        ]
        return {
            "project_id": project_id,
            "group_by": normalized_group_by,
            "groups": grouped,
            "total_groups": len(grouped),
        }

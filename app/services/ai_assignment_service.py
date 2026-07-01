from app.repositories.profile_repository import ProfileRepository
from app.repositories.operational_action_repository import (
    OperationalActionRepository,
)

ASSIGNABLE_ROLES = ["ADMIN", "SUPERVISOR", "MANAGER"]


class AIAssignmentService:

    def __init__(
        self,
        profile_repository: ProfileRepository | None = None,
        operational_action_repository: OperationalActionRepository | None = None,
    ):
        self.profile_repository = profile_repository or ProfileRepository()
        self.operational_action_repository = (
            operational_action_repository or OperationalActionRepository()
        )

    # ==========================================
    # GET BEST ASSIGNEE
    # ==========================================

    def get_best_assignee(self, project_id: str):
        profiles = self.get_available_profiles()

        if not profiles:
            return None

        profile_ids = [profile["id"] for profile in profiles]
        workloads = self.get_workloads_for_profiles(profile_ids)

        ranked_profiles = []
        for profile in profiles:
            workload = workloads.get(profile["id"], 0)
            score = self.calculate_assignment_score(profile, workload)
            ranked_profiles.append({
                "profile": profile,
                "score": score,
                "workload": workload,
            })

        ranked_profiles.sort(key=lambda item: item["score"], reverse=True)

        return ranked_profiles[0]["profile"]

    # ==========================================
    # GET AVAILABLE PROFILES
    # ==========================================

    def get_available_profiles(self):
        return self.profile_repository.get_profiles_by_roles(ASSIGNABLE_ROLES)

    # ==========================================
    # GET WORKLOAD
    # ==========================================

    def get_profile_workload(self, profile_id: str):
        return self.operational_action_repository.count_open_actions_for_assignee(
            profile_id
        )

    def get_workloads_for_profiles(self, profile_ids: list[str]) -> dict[str, int]:
        if not profile_ids:
            return {}

        rows = self.operational_action_repository.get_assignees_for_open_actions(
            profile_ids
        )

        workloads = {profile_id: 0 for profile_id in profile_ids}
        for row in rows:
            assigned_to = row.get("assigned_to")
            if assigned_to in workloads:
                workloads[assigned_to] += 1

        return workloads

    # ==========================================
    # CALCULATE SCORE
    # ==========================================

    def calculate_assignment_score(self, profile: dict, workload: int):
        role = profile.get("role")
        base_score = 100

        if role == "ADMIN":
            base_score += 20

        if role == "MANAGER" or role == "SUPERVISOR":
            base_score += 10

        workload_penalty = workload * 5
        final_score = base_score - workload_penalty

        return final_score

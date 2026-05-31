from app.db.supabase_client import (
    supabase
)


class AIAssignmentService:

    def __init__(self):

        self.client = (
            supabase
        )

    # ==========================================
    # GET BEST ASSIGNEE
    # ==========================================

    def get_best_assignee(
        self,
        project_id: str,
    ):

        profiles = (
            self.get_available_profiles()
        )

        if not profiles:
            return None

        profile_ids = [
            profile["id"]
            for profile in profiles
        ]

        workloads = (
            self.get_workloads_for_profiles(
                profile_ids
            )
        )

        ranked_profiles = []

        for profile in profiles:

            workload = (
                workloads.get(
                    profile["id"],
                    0,
                )
            )

            score = (
                self.calculate_assignment_score(
                    profile,
                    workload,
                )
            )

            ranked_profiles.append({

                "profile":
                    profile,

                "score":
                    score,

                "workload":
                    workload,
            })

        ranked_profiles.sort(

            key=lambda item:
                item["score"],

            reverse=True,
        )

        return ranked_profiles[0][
            "profile"
        ]

    # ==========================================
    # GET AVAILABLE PROFILES
    # ==========================================

    def get_available_profiles(
        self,
    ):

        response = (
            self.client
            .table("profiles")
            .select("*")
            .in_(
                "role",
                [
                    "ADMIN",
                    "SUPERVISOR",
                    "MANAGER",
                ]
            )
            .execute()
        )

        return response.data

    # ==========================================
    # GET WORKLOAD
    # ==========================================

    def get_profile_workload(
        self,
        profile_id: str,
    ):

        response = (
            self.client
            .table(
                "operational_actions"
            )
            .select("id")

            .eq(
                "assigned_to",
                profile_id
            )

            .in_(
                "status",
                [
                    "OPEN",
                    "IN_PROGRESS",
                    "BLOCKED",
                ]
            )

            .execute()
        )

        return len(
            response.data
        )

    def get_workloads_for_profiles(
        self,
        profile_ids: list[str],
    ) -> dict[str, int]:

        if not profile_ids:
            return {}

        response = (
            self.client
            .table(
                "operational_actions"
            )
            .select("assigned_to")

            .in_(
                "assigned_to",
                profile_ids
            )

            .in_(
                "status",
                [
                    "OPEN",
                    "IN_PROGRESS",
                    "BLOCKED",
                ]
            )

            .execute()
        )

        workloads = {
            profile_id: 0
            for profile_id in profile_ids
        }

        for row in response.data or []:
            assigned_to = row.get("assigned_to")

            if assigned_to in workloads:
                workloads[assigned_to] += 1

        return workloads

    # ==========================================
    # CALCULATE SCORE
    # ==========================================

    def calculate_assignment_score(
        self,
        profile: dict,
        workload: int,
    ):

        role = (
            profile.get(
                "role"
            )
        )

        base_score = 100

        if role == "ADMIN":

            base_score += 20

        if role == "MANAGER" or role == "SUPERVISOR":

            base_score += 10

        workload_penalty = (
            workload * 5
        )

        final_score = (
            base_score
            - workload_penalty
        )

        return final_score
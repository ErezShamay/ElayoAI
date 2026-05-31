class ProjectHealthService:

    @staticmethod
    def calculate_health(
        reviews,
        actions,
        escalations,
    ):

        score = 100

        # =========================
        # OPEN ACTIONS
        # =========================

        score -= (
            len(actions or []) * 3
        )

        # =========================
        # ESCALATIONS
        # =========================

        score -= (
            len(escalations or []) * 10
        )

        # =========================
        # HIGH RISK REVIEWS
        # =========================

        for review in reviews or []:

            risk = (
                review.get(
                    "tenant_risk",
                    ""
                )
                .lower()
            )

            if (
                "high" in risk
                or "גבוה" in risk
            ):

                score -= 15

        # =========================
        # LIMITS
        # =========================

        score = max(score, 0)

        # =========================
        # STATUS
        # =========================

        if score >= 80:

            status = "HEALTHY"

        elif score >= 50:

            status = "WARNING"

        else:

            status = "CRITICAL"

        return {

            "score": score,

            "status": status,
        }
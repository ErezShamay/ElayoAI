class PredictiveRiskService:

    @staticmethod
    def predict_project_risk(
        workspace: dict,
    ):

        health = (
            workspace["health"]
        )

        summary = (
            workspace["summary"]
        )

        risk_score = 0

        # =========================
        # HEALTH SCORE
        # =========================

        if (
            health["score"] < 50
        ):

            risk_score += 40

        elif (
            health["score"] < 80
        ):

            risk_score += 20

        # =========================
        # ESCALATIONS
        # =========================

        escalations = (
            summary[
                "escalations_count"
            ]
        )

        risk_score += (
            escalations * 10
        )

        # =========================
        # OPEN ACTIONS
        # =========================

        actions = (
            summary[
                "actions_count"
            ]
        )

        risk_score += (
            actions * 2
        )

        # =========================
        # PREDICTION
        # =========================

        if risk_score >= 70:

            prediction = (
                "HIGH_RISK"
            )

            message = (
                "הפרויקט צפוי להידרדר בטווח הקרוב"
            )

        elif risk_score >= 40:

            prediction = (
                "MEDIUM_RISK"
            )

            message = (
                "נדרשת בקרה מוגברת בפרויקט"
            )

        else:

            prediction = (
                "LOW_RISK"
            )

            message = (
                "הפרויקט יציב בשלב זה"
            )

        return {

            "prediction":
                prediction,

            "risk_score":
                risk_score,

            "message":
                message,
        }
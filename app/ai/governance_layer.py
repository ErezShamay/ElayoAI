class AIGovernanceLayer:
    def __init__(
        self,
        minimum_confidence_score: int = 60,
        max_hallucination_risk: float = 0.6,
    ):
        self.minimum_confidence_score = minimum_confidence_score
        self.max_hallucination_risk = max_hallucination_risk

    def evaluate(
        self,
        *,
        confidence_score: int,
        hallucination_risk: float,
    ) -> dict:
        allowed = (
            confidence_score >= self.minimum_confidence_score
            and hallucination_risk <= self.max_hallucination_risk
        )
        reasons = []
        if confidence_score < self.minimum_confidence_score:
            reasons.append("LOW_CONFIDENCE")
        if hallucination_risk > self.max_hallucination_risk:
            reasons.append("HIGH_HALLUCINATION_RISK")
        return {
            "allowed": allowed,
            "reasons": reasons,
            "minimum_confidence_score": self.minimum_confidence_score,
            "max_hallucination_risk": self.max_hallucination_risk,
        }

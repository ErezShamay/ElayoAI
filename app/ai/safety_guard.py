import re


class AISafetyGuard:
    PROMPT_INJECTION_PATTERNS = (
        r"ignore\s+previous\s+instructions",
        r"system\s+prompt",
        r"reveal\s+hidden\s+rules",
        r"bypass\s+safety",
    )

    def check_prompt_injection(self, prompt: str) -> None:
        normalized = prompt.lower()
        for pattern in self.PROMPT_INJECTION_PATTERNS:
            if re.search(pattern, normalized):
                raise ValueError("Prompt injection risk detected")

    def sanitize_response(self, response: str) -> str:
        sanitized = re.sub(r"<\s*script[^>]*>.*?<\s*/\s*script\s*>", "", response, flags=re.I | re.S)
        sanitized = sanitized.replace("\x00", "")
        return sanitized.strip()

    def detect_hallucination_risk(self, response: str) -> float:
        risk = 0.0
        lowered = response.lower()
        if "i'm not sure" in lowered or "cannot verify" in lowered:
            risk += 0.35
        if "definitely" in lowered and "source" not in lowered:
            risk += 0.25
        if len(response.strip()) < 15:
            risk += 0.2
        return min(risk, 1.0)

    def confidence_score(
        self,
        response: str,
        hallucination_risk: float,
    ) -> int:
        score = 100 - int(hallucination_risk * 100)
        if "{" in response and "}" in response:
            score += 5
        return max(0, min(score, 100))

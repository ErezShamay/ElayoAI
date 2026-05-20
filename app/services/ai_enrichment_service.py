import json

import ollama


class AIEnrichmentService:

    def enrich_finding(
        self,
        finding
    ):

        prompt = f"""
You are an engineering oversight AI assistant.

Your job is to analyze engineering oversight findings
from urban renewal and construction supervision projects.

Analyze the following finding:

Finding Type:
{finding.finding_type}

Finding Summary:
{finding.summary}

Return ONLY valid JSON with this structure:

{{
  "business_impact": "...",
  "tenant_risk": "...",
  "recommended_action": "..."
}}
"""

        response = ollama.chat(
            model="llama3",

            messages=[
                {
                    "role": "user",
                    "content": prompt,
                }
            ]
        )

        content = (
            response["message"]["content"]
        )

        try:

            parsed = json.loads(
                content
            )

            return parsed

        except Exception:

            return {
                "business_impact":
                    "Unknown",

                "tenant_risk":
                    "Unknown",

                "recommended_action":
                    "Manual review required",
            }
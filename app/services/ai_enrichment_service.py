import json

import ollama

from app.config.ai_config import (
    DEFAULT_AI_MODEL
)

from app.schemas.ai_interpretation import (
    AIInterpretation
)


class AIEnrichmentService:

    def __init__(
        self,
        model_name: str | None = None
    ):

        self.model_name = (
            model_name
            or DEFAULT_AI_MODEL
        )

    def enrich_finding(
        self,
        finding
    ) -> dict:

        prompt = f"""
אתה עוזר AI מקצועי בתחום הפיקוח ההנדסי,
התחדשות עירונית, תמ״א 38, פינוי בינוי
וניהול פרויקטי בנייה.

המטרה שלך היא לנתח ממצאים תפעוליים והנדסיים
ולהחזיר הערכה מקצועית בעברית בלבד.

יש לנסח תשובות:
- קצרות
- מקצועיות
- תפעוליות
- ברורות למנהלי פרויקטים ומפקחים

נתח את הממצא הבא:

סוג ממצא:
{finding.finding_type}

תיאור ממצא:
{finding.summary}

החזר JSON תקין בלבד.

פורמט תשובה:

{{
  "business_impact": "תיאור קצר בלבד",
  "tenant_risk": "תיאור קצר בלבד",
  "recommended_action": "תיאור קצר בלבד"
}}

חשוב:
- אין להוסיף כותרות
- אין להוסיף הסברים
- אין להחזיר טקסט באנגלית
- אין להחזיר markdown
- יש להחזיר JSON בלבד
"""

        print(
            f"\nUSING MODEL: {self.model_name}\n"
        )

        response = ollama.chat(
            model=self.model_name,

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

        print(
            "\n=== RAW LLM RESPONSE ===\n"
        )

        print(content)

        print()

        cleaned_content = (
            self._extract_json(
                content
            )
        )

        try:

            parsed = json.loads(
                cleaned_content
            )

            return {
                "model_name":
                    self.model_name,

                "business_impact":
                    parsed[
                        "business_impact"
                    ],

                "tenant_risk":
                    parsed[
                        "tenant_risk"
                    ],

                "recommended_action":
                    parsed[
                        "recommended_action"
                    ],

                "raw_response":
                    content,
            }

        except Exception as e:

            print(
                "\nJSON PARSE ERROR:\n"
            )

            print(str(e))

            return {
                "model_name":
                    self.model_name,

                "business_impact":
                    "נדרשת בדיקה ידנית",

                "tenant_risk":
                    "לא זוהה",

                "recommended_action":
                    "יש לבצע בדיקה ידנית של הממצא",

                "raw_response":
                    content,
            }

    def build_interpretation(
        self,
        finding_id: str,
        enrichment_data: dict
    ) -> AIInterpretation:

        return AIInterpretation(
            finding_id=
                finding_id,

            model_name=
                enrichment_data[
                    "model_name"
                ],

            business_impact=
                enrichment_data[
                    "business_impact"
                ],

            tenant_risk=
                enrichment_data[
                    "tenant_risk"
                ],

            recommended_action=
                enrichment_data[
                    "recommended_action"
                ],

            raw_response=
                enrichment_data[
                    "raw_response"
                ],
        )

    def _extract_json(
        self,
        text: str
    ) -> str:

        start = text.find("{")

        end = text.rfind("}")

        if (
            start == -1
            or end == -1
        ):

            return text

        return text[
            start:end + 1
        ]
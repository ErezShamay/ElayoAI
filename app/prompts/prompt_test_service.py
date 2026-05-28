from app.prompts.prompt_loader import PromptLoader
from app.prompts.prompt_registry import PROMPTS


class PromptTestService:
    def validate_prompt(
        self,
        prompt_name: str,
        sample_context: dict,
        version: str | None = None,
    ) -> dict:
        try:
            rendered = PromptLoader.load_prompt(
                prompt_name=prompt_name,
                version=version,
                **sample_context,
            )
            return {
                "prompt_name": prompt_name,
                "version": version or PROMPTS[prompt_name]["active_version"],
                "success": True,
                "rendered_length": len(rendered),
                "error": None,
            }
        except Exception as exc:
            return {
                "prompt_name": prompt_name,
                "version": version,
                "success": False,
                "rendered_length": 0,
                "error": str(exc),
            }

    def validate_all(self, sample_contexts: dict[str, dict]) -> dict:
        results = []
        for prompt_name, prompt_config in PROMPTS.items():
            for version in prompt_config.get("versions", {}).keys():
                sample_context = sample_contexts.get(prompt_name, {})
                results.append(
                    self.validate_prompt(
                        prompt_name=prompt_name,
                        sample_context=sample_context,
                        version=version,
                    )
                )
        successful = sum(1 for result in results if result["success"])
        return {
            "total": len(results),
            "successful": successful,
            "failed": len(results) - successful,
            "results": results,
        }

from pathlib import Path

from app.prompts.prompt_registry import (
    PROMPTS
)


class PromptLoader:

    PROMPTS_DIR = (
        Path(__file__)
        .parent
    )

    @staticmethod
    def load_prompt(
        prompt_name: str,
        version: str | None = None,
        **kwargs,
    ) -> str:

        if prompt_name not in PROMPTS:

            raise Exception(
                f"Unknown prompt: {prompt_name}"
            )

        prompt_config = PROMPTS[prompt_name]
        resolved_version = version or prompt_config.get("active_version")
        versions = prompt_config.get("versions", {})
        if resolved_version not in versions:
            raise Exception(
                f"Unknown prompt version: {prompt_name}:{resolved_version}"
            )
        prompt_file = versions[resolved_version]["file"]

        prompt_path = (
            PromptLoader.PROMPTS_DIR
            / f"{prompt_file}.txt"
        )

        prompt_template = (
            prompt_path
            .read_text(
                encoding="utf-8"
            )
        )

        return prompt_template.format(
            **kwargs
        )
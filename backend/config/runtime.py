from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv

    load_dotenv(Path(__file__).resolve().parent.parent / ".env")
except ImportError:
    pass

ALLOWED_MODES = ("mock", "bob", "hybrid")
_DEFAULT_MODE = "hybrid"


class RuntimeConfig:
    def __init__(self) -> None:
        self.llm_mode: str = os.environ.get("KRONOS_LLM_MODE", _DEFAULT_MODE).strip().lower()
        if self.llm_mode not in ALLOWED_MODES:
            self.llm_mode = _DEFAULT_MODE

        self.bob_api_url: str = os.environ.get(
            "BOB_API_URL",
            "https://api.bob-llm.dev/v1/chat/completions",
        )
        self.bob_api_key: str | None = os.environ.get("BOB_API_KEY")
        self.bob_project_id: str | None = os.environ.get("BOB_PROJECT_ID")
        self.bob_model_id: str | None = os.environ.get("BOB_MODEL_ID")


_config: RuntimeConfig | None = None


def get_runtime_config() -> RuntimeConfig:
    global _config
    if _config is None:
        _config = RuntimeConfig()
    return _config


def reset_runtime_config() -> None:
    global _config
    _config = None

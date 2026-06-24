from __future__ import annotations

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None  # type: ignore[assignment]

ALLOWED_MODES = ("mock", "bob", "hybrid", "granite")
_DEFAULT_MODE = "hybrid"

_DOTENV_PATH: Path = Path(__file__).resolve().parent.parent / ".env"


def _ensure_dotenv() -> None:
    """Re-seed os.environ from .env without overriding existing values."""
    if load_dotenv is not None:
        load_dotenv(_DOTENV_PATH)


# Seed once at import time.
_ensure_dotenv()


class RuntimeConfig:
    def __init__(self) -> None:
        # Re-seed so .env values survive os.environ.clear() (e.g. test teardown).
        _ensure_dotenv()

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

        self.granite_api_key: str | None = (
            os.environ.get("GRANITE_API_KEY")
            or os.environ.get("IBM_API_KEY")
        )
        self.granite_runtime_url: str = (
            os.environ.get("GRANITE_RUNTIME_URL")
            or os.environ.get("IBM_RUNTIME_URL")
            or "https://eu-de.ml.cloud.ibm.com"
        )
        self.granite_space_id: str | None = (
            os.environ.get("GRANITE_SPACE_ID")
            or os.environ.get("IBM_SPACE_ID")
        )
        self.granite_model_id: str = (
            os.environ.get("GRANITE_MODEL_ID")
            or os.environ.get("IBM_MODEL_ID")
            or "ibm/granite-3-8b-instruct"
        )


_config: RuntimeConfig | None = None


def get_runtime_config() -> RuntimeConfig:
    global _config
    if _config is None:
        _config = RuntimeConfig()
    return _config


def reset_runtime_config() -> None:
    global _config
    _config = None

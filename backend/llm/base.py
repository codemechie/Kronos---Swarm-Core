from __future__ import annotations

from typing import Protocol

from backend.llm.contracts import LLMResponse


class BaseProvider(Protocol):
    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        ...

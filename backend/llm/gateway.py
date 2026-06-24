from __future__ import annotations

import logging

from backend.config.runtime import get_runtime_config
from backend.llm.contracts import LLMResponse
from backend.llm.mock_provider import MockProvider
from backend.llm.bob_provider import BobProvider
from backend.llm.granite_provider import GraniteProvider

logger = logging.getLogger("kronos.llm")


class LLMGateway:
    """Provider-agnostic gateway for generating LLM responses.

    The orchestrator calls ``generate(agent_name, prompt)`` without
    knowing which provider served the response.
    """

    def __init__(self) -> None:
        cfg = get_runtime_config()
        self.mode = cfg.llm_mode
        self._mock = MockProvider()
        self._bob: BobProvider | None = None
        self._granite: GraniteProvider | None = None

        if self.mode in ("bob", "hybrid"):
            self._bob = BobProvider()

        if self.mode == "granite":
            self._granite = GraniteProvider()

        logger.info("[LLM] mode=%s", self.mode)

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        logger.info("[LLM] %s -> %s", agent_name, self.mode)

        if self.mode == "mock":
            return self._mock.generate(agent_name, prompt)

        if self.mode == "bob":
            if self._bob is None:
                raise RuntimeError("BOB provider not available in bob mode")
            return self._bob.generate(agent_name, prompt)

        if self.mode == "granite":
            if self._granite is None:
                raise RuntimeError("Granite provider not available in granite mode")
            return self._granite.generate(agent_name, prompt)

        # hybrid mode: try BOB, fall back to mock
        if self._bob is not None:
            try:
                return self._bob.generate(agent_name, prompt)
            except Exception:
                logger.warning("[LLM] %s -> mock (fallback)", agent_name)

        return self._mock.generate(agent_name, prompt)

from __future__ import annotations

from backend.llm.contracts import LLMResponse


class MockProvider:
    """Deterministic mock LLM provider.

    Behaviour is identical to the original ``_mock_llm_response`` method
    that lived inside ``KronosOrchestrator``.
    """

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        if "Risk" in prompt or "risk" in prompt:
            content = (
                f"[{agent_name.upper()}]: High-risk pattern detected. "
                f"Variance exceeds threshold — recommend elevated caution."
            )
        else:
            content = (
                f"[{agent_name.upper()}]: Nominal conditions observed. "
                f"No significant deviation from expected range."
            )
        return LLMResponse(provider="mock", content=content)

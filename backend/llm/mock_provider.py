from __future__ import annotations

from backend.llm.contracts import LLMResponse
from backend.agents.persona_builder import build as persona_build


class MockProvider:
    """Deterministic mock LLM provider.

    Uses ``PersonaBuilder`` to generate agent-specific rationale text
    with distinctive voice, signal-aware templates, and deterministic
    template selection (via ``hash(prompt)``).

    Behaviour is identical to the original ``_mock_llm_response`` method
    that lived inside ``KronosOrchestrator``, except the content is now
    personality-rich and telemetry-aware.
    """

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        is_risk = "Risk" in prompt or "risk" in prompt
        content = persona_build(agent_name, prompt, is_risk)
        return LLMResponse(provider="mock", content=content)

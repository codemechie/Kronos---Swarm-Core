from __future__ import annotations

import json
import logging
from urllib.request import Request, urlopen
from urllib.error import URLError

from backend.config.runtime import get_runtime_config
from backend.llm.contracts import LLMResponse

logger = logging.getLogger("kronos.llm")

BOB_TIMEOUT_SECONDS = 10
MAX_RETRIES = 1


class BobProvider:
    """LLM provider that calls the BOB external API."""

    def __init__(self) -> None:
        cfg = get_runtime_config()
        self.api_url = cfg.bob_api_url
        self.api_key = cfg.bob_api_key
        self.project_id = cfg.bob_project_id
        self.model_id = cfg.bob_model_id

    def _build_payload(self, agent_name: str, prompt: str) -> bytes:
        body = {
            "model_id": self.model_id or "default",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        f"You are {agent_name}, an AI agent in a swarm "
                        f"analysing football match telemetry."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }
        return json.dumps(body).encode("utf-8")

    def _build_headers(self) -> dict[str, str]:
        headers: dict[str, str] = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        if self.project_id:
            headers["X-Project-Id"] = self.project_id
        return headers

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        url = self.api_url
        payload = self._build_payload(agent_name, prompt)
        headers = self._build_headers()

        last_error: Exception | None = None

        for attempt in range(1 + MAX_RETRIES):
            try:
                req = Request(url, data=payload, headers=headers, method="POST")
                with urlopen(req, timeout=BOB_TIMEOUT_SECONDS) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content: str = data["choices"][0]["message"]["content"]
                    return LLMResponse(provider="bob", content=content)

            except URLError as e:
                last_error = e
                logger.warning("[LLM] bob attempt %d/%d failed: %s", attempt + 1, MAX_RETRIES + 1, e.reason)
            except Exception as e:
                last_error = e
                logger.warning("[LLM] bob attempt %d/%d failed: %s", attempt + 1, MAX_RETRIES + 1, str(e))

        raise RuntimeError(f"BOB provider failed after {MAX_RETRIES + 1} attempts") from last_error

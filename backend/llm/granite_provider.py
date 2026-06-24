from __future__ import annotations

import json
import logging
import time
import urllib.parse
from urllib.request import Request, urlopen
from urllib.error import URLError

from backend.config.runtime import get_runtime_config
from backend.llm.contracts import LLMResponse

logger = logging.getLogger("kronos.llm")

IAM_TOKEN_URL = "https://iam.cloud.ibm.com/identity/token"
GRANITE_TIMEOUT_SECONDS = 30
MAX_RETRIES = 1


class GraniteProvider:
    """LLM provider that calls IBM watsonx.ai Granite models.

    Uses IAM token authentication and the watsonx Runtime chat endpoint.
    IAM tokens are cached and automatically refreshed when near expiry.
    """

    def __init__(self) -> None:
        cfg = get_runtime_config()
        self.api_key = cfg.granite_api_key
        self.runtime_url = cfg.granite_runtime_url.rstrip("/")
        self.space_id = cfg.granite_space_id
        self.model_id = cfg.granite_model_id

        self._cached_token: str | None = None
        self._token_expiry: float = 0.0

    # ── IAM Token Management ──────────────────────────────────────────

    def _get_iam_token(self) -> str:
        """Return a valid IAM access token, cached or freshly obtained."""
        now = time.time()
        if self._cached_token is not None and self._token_expiry > now + 300:
            return self._cached_token

        if not self.api_key:
            raise RuntimeError("GRANITE_API_KEY is not configured")

        body = urllib.parse.urlencode({
            "grant_type": "urn:ibm:params:oauth:grant-type:apikey",
            "apikey": self.api_key,
        }).encode("utf-8")

        req = Request(
            IAM_TOKEN_URL,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )

        try:
            with urlopen(req, timeout=GRANITE_TIMEOUT_SECONDS) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                self._cached_token = data["access_token"]
                self._token_expiry = now + float(data["expires_in"])
                logger.debug("[GRANITE] IAM token obtained, expires in %s s", data["expires_in"])
                return self._cached_token
        except URLError as e:
            raise RuntimeError(f"Failed to obtain IAM token: {e.reason}") from e
        except Exception as e:
            raise RuntimeError(f"Failed to obtain IAM token: {e}") from e

    # ── Inference ─────────────────────────────────────────────────────

    def _build_payload(self, agent_name: str, prompt: str) -> bytes:
        body: dict = {
            "model_id": self.model_id,
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
        if self.space_id:
            body["space_id"] = self.space_id
        return json.dumps(body).encode("utf-8")

    def _build_headers(self) -> dict[str, str]:
        token = self._get_iam_token()
        return {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        }

    def generate(self, agent_name: str, prompt: str) -> LLMResponse:
        url = f"{self.runtime_url}/ml/v1/text/chat?version=2024-05-01"
        payload = self._build_payload(agent_name, prompt)
        headers = self._build_headers()

        last_error: Exception | None = None

        for attempt in range(1 + MAX_RETRIES):
            try:
                logger.info("[GRANITE] request started for %s (attempt %d)", agent_name, attempt + 1)
                req = Request(url, data=payload, headers=headers, method="POST")
                with urlopen(req, timeout=GRANITE_TIMEOUT_SECONDS) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    content: str = data["choices"][0]["message"]["content"]
                    logger.info("[GRANITE] request completed for %s", agent_name)
                    return LLMResponse(provider="granite", content=content)

            except URLError as e:
                last_error = e
                logger.warning(
                    "[GRANITE] request failed for %s (attempt %d/%d): %s",
                    agent_name, attempt + 1, MAX_RETRIES + 1, e.reason,
                )
            except Exception as e:
                last_error = e
                logger.warning(
                    "[GRANITE] request failed for %s (attempt %d/%d): %s",
                    agent_name, attempt + 1, MAX_RETRIES + 1, str(e),
                )

        raise RuntimeError(
            f"Granite provider failed for '{agent_name}' after {MAX_RETRIES + 1} attempts"
        ) from last_error

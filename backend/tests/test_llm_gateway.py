from __future__ import annotations

import json
import os
import unittest
from unittest.mock import patch, MagicMock

from backend.llm.gateway import LLMGateway
from backend.llm.mock_provider import MockProvider
from backend.llm.contracts import LLMResponse
from backend.config.runtime import reset_runtime_config


class TestMockProvider(unittest.TestCase):
    def setUp(self) -> None:
        self.provider = MockProvider()

    def test_high_risk_prompt(self) -> None:
        resp = self.provider.generate("Judge", "There is a risk of cards")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("High-risk", resp.content)

    def test_nominal_prompt(self) -> None:
        resp = self.provider.generate("Judge", "Everything is normal")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("Nominal:", resp.content)

    def test_case_sensitive_risk(self) -> None:
        resp = self.provider.generate("Judge", "Risk of something")
        self.assertIn("High-risk", resp.content)


class TestLLMGatewayMockMode(unittest.TestCase):
    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "mock"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    def test_mock_mode_returns_mock_response(self) -> None:
        gate = LLMGateway()
        resp = gate.generate("Judge", "risk is high")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("High-risk", resp.content)

    def test_mock_mode_nominal(self) -> None:
        gate = LLMGateway()
        resp = gate.generate("Judge", "all clear")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("Nominal:", resp.content)


class TestLLMGatewayHybridMode(unittest.TestCase):
    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "hybrid"
        os.environ["BOB_API_KEY"] = "test-key"
        os.environ["BOB_PROJECT_ID"] = "test-project"
        os.environ["BOB_MODEL_ID"] = "test-model"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.bob_provider.urlopen")
    def test_hybrid_bob_success(self, mock_urlopen: MagicMock) -> None:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"choices": [{"message": {"content": "BOB says hold"}}]}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        gate = LLMGateway()
        resp = gate.generate("Judge", "analysis")
        self.assertEqual(resp.provider, "bob")
        self.assertIn("BOB says hold", resp.content)

    @patch("backend.llm.bob_provider.urlopen")
    def test_hybrid_bob_timeout_falls_back_to_mock(
        self, mock_urlopen: MagicMock
    ) -> None:
        from urllib.error import URLError

        mock_urlopen.side_effect = URLError("timeout")

        gate = LLMGateway()
        resp = gate.generate("Judge", "risk is elevated")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("High-risk", resp.content)

    def test_hybrid_no_credentials_falls_back_to_mock(self) -> None:
        os.environ.pop("BOB_API_KEY", None)
        os.environ.pop("BOB_PROJECT_ID", None)
        os.environ.pop("BOB_MODEL_ID", None)

        gate = LLMGateway()
        resp = gate.generate("Judge", "risk")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("High-risk", resp.content)


class TestLLMGatewayBobMode(unittest.TestCase):
    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "bob"
        os.environ["BOB_API_KEY"] = "test-key"
        os.environ["BOB_PROJECT_ID"] = "test-project"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.bob_provider.urlopen")
    def test_bob_mode_routes_to_bob(self, mock_urlopen: MagicMock) -> None:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"choices": [{"message": {"content": "bob response"}}]}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        gate = LLMGateway()
        resp = gate.generate("Judge", "analysis")
        self.assertEqual(resp.provider, "bob")

    @patch("backend.llm.bob_provider.urlopen")
    def test_bob_mode_raises_on_failure(self, mock_urlopen: MagicMock) -> None:
        from urllib.error import URLError

        mock_urlopen.side_effect = URLError("timeout")

        gate = LLMGateway()
        with self.assertRaises(RuntimeError):
            gate.generate("Judge", "analysis")


class TestProviderMetadata(unittest.TestCase):
    @patch("backend.llm.bob_provider.urlopen")
    def test_provider_metadata_in_orchestrator_output(
        self, mock_urlopen: MagicMock
    ) -> None:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"choices": [{"message": {"content": "bob"}}]}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        os.environ["KRONOS_LLM_MODE"] = "hybrid"
        os.environ["BOB_API_KEY"] = "key"
        os.environ["BOB_PROJECT_ID"] = "proj"
        os.environ["BOB_MODEL_ID"] = "model"

        from backend.orchestrator.core_supervisor import KronosOrchestrator

        orch = KronosOrchestrator()
        result = orch.process_next_tick()

        self.assertIn("provider_metadata", result)
        meta = result["provider_metadata"]
        self.assertEqual(len(meta), 5)
        for agent_key, provider in meta.items():
            self.assertIn(provider, ("mock", "bob"))



class TestGraniteProviderInit(unittest.TestCase):
    """GraniteProvider initialisation and environment config."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["GRANITE_API_KEY"] = "test-granite-key"
        os.environ["GRANITE_SPACE_ID"] = "test-space"
        os.environ["GRANITE_MODEL_ID"] = "ibm/granite-model"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    def test_initialises_from_config(self) -> None:
        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        self.assertEqual(provider.api_key, "test-granite-key")
        self.assertEqual(provider.space_id, "test-space")
        self.assertEqual(provider.model_id, "ibm/granite-model")
        self.assertEqual(provider.runtime_url, "https://eu-de.ml.cloud.ibm.com")
        self.assertIsNone(provider._cached_token)

    def test_runtime_url_default(self) -> None:
        os.environ["GRANITE_RUNTIME_URL"] = ""
        os.environ["IBM_RUNTIME_URL"] = ""
        reset_runtime_config()
        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        self.assertEqual(provider.runtime_url, "https://eu-de.ml.cloud.ibm.com")

    def test_custom_runtime_url(self) -> None:
        os.environ["GRANITE_RUNTIME_URL"] = "https://custom.cloud.ibm.com"
        reset_runtime_config()
        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        self.assertEqual(provider.runtime_url, "https://custom.cloud.ibm.com")


class TestGraniteProviderIAMToken(unittest.TestCase):
    """IAM token acquisition and caching."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["GRANITE_API_KEY"] = "test-granite-key"
        os.environ["GRANITE_SPACE_ID"] = "test-space"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.granite_provider.urlopen")
    def test_obtains_iam_token(self, mock_urlopen: MagicMock) -> None:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"access_token": "fake-token-123", "expires_in": 3600}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        token = provider._get_iam_token()

        self.assertEqual(token, "fake-token-123")
        self.assertEqual(provider._cached_token, "fake-token-123")
        self.assertGreater(provider._token_expiry, 0)

    @patch("backend.llm.granite_provider.urlopen")
    def test_caches_token(self, mock_urlopen: MagicMock) -> None:
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"access_token": "cached-token", "expires_in": 3600}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        token1 = provider._get_iam_token()
        token2 = provider._get_iam_token()

        self.assertEqual(token1, token2)
        self.assertEqual(mock_urlopen.call_count, 1)

    def test_raises_without_api_key(self) -> None:
        os.environ["GRANITE_API_KEY"] = ""
        os.environ["IBM_API_KEY"] = ""
        reset_runtime_config()
        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        with self.assertRaises(RuntimeError):
            provider._get_iam_token()


class TestGraniteProviderInference(unittest.TestCase):
    """Inference request and response handling."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "granite"
        os.environ["GRANITE_API_KEY"] = "test-granite-key"
        os.environ["GRANITE_SPACE_ID"] = "test-space"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_returns_llm_response(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        mock_iam.return_value = "fake-token"
        mock_resp = MagicMock()
        mock_resp.read.return_value = (
            b'{"choices": [{"message": {"content": "Granite analysis result"}}]}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        resp = provider.generate("Market Pragmatist", "Analyze this match state.")

        self.assertIsInstance(resp, LLMResponse)
        self.assertEqual(resp.provider, "granite")
        self.assertEqual(resp.content, "Granite analysis result")

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_payload_contains_space_id(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        mock_iam.return_value = "fake-token"
        mock_resp = MagicMock()
        mock_resp.read.return_value = (
            b'{"choices": [{"message": {"content": "ok"}}]}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        provider.generate("Judge", "test")

        call_args = mock_urlopen.call_args[0][0]
        body = json.loads(call_args.data)

        self.assertIn("space_id", body)
        self.assertEqual(body["space_id"], "test-space")
        self.assertIn("model_id", body)
        self.assertEqual(body["messages"][0]["role"], "system")
        self.assertEqual(body["messages"][1]["role"], "user")

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_raises_on_http_error(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        from urllib.error import URLError

        mock_iam.return_value = "fake-token"
        mock_urlopen.side_effect = URLError("service unavailable")

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        with self.assertRaises(RuntimeError):
            provider.generate("Judge", "test")

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_agent_name_in_system_message(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        mock_iam.return_value = "fake-token"
        mock_resp = MagicMock()
        mock_resp.read.return_value = b'{"choices": [{"message": {"content": "ok"}}]}'
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        provider.generate("Mood Ring", "analyze")

        call_args = mock_urlopen.call_args[0][0]
        body = json.loads(call_args.data)
        self.assertIn("Mood Ring", body["messages"][0]["content"])


class TestLLMGatewayGraniteMode(unittest.TestCase):
    """Gateway routing in granite mode."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["KRONOS_LLM_MODE"] = "granite"
        os.environ["GRANITE_API_KEY"] = "test-granite-key"
        os.environ["GRANITE_SPACE_ID"] = "test-space"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_gateway_routes_to_granite(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        mock_iam.return_value = "fake-token"
        mock_resp = MagicMock()
        mock_resp.read.return_value = (
            b'{"choices": [{"message": {"content": "granite response"}}]}'
        )
        mock_urlopen.return_value.__enter__.return_value = mock_resp

        gate = LLMGateway()
        resp = gate.generate("Judge", "analysis")

        self.assertEqual(resp.provider, "granite")
        self.assertIn("granite response", resp.content)

    def test_gateway_raises_without_granite_config(self) -> None:
        os.environ["GRANITE_API_KEY"] = ""
        os.environ["IBM_API_KEY"] = ""
        os.environ["GRANITE_SPACE_ID"] = ""
        os.environ["IBM_SPACE_ID"] = ""
        reset_runtime_config()

        gate = LLMGateway()
        with self.assertRaises(RuntimeError):
            gate.generate("Judge", "analysis")


class TestGraniteProviderRetry(unittest.TestCase):
    """Retry behaviour on transient failures."""

    def setUp(self) -> None:
        self._env = dict(os.environ)
        os.environ["GRANITE_API_KEY"] = "test-granite-key"
        os.environ["GRANITE_SPACE_ID"] = "test-space"
        reset_runtime_config()

    def tearDown(self) -> None:
        os.environ.clear()
        os.environ.update(self._env)

    @patch("backend.llm.granite_provider.GraniteProvider._get_iam_token")
    @patch("backend.llm.granite_provider.urlopen")
    def test_retries_on_transient_failure_then_succeeds(
        self, mock_urlopen: MagicMock, mock_iam: MagicMock
    ) -> None:
        from urllib.error import URLError

        mock_iam.return_value = "fake-token"

        good_cm = MagicMock()
        good_resp = MagicMock()
        good_resp.read.return_value = (
            b'{"choices": [{"message": {"content": "retry success"}}]}'
        )
        good_cm.__enter__.return_value = good_resp

        mock_urlopen.side_effect = [
            URLError("timeout"),
            good_cm,
        ]

        from backend.llm.granite_provider import GraniteProvider

        provider = GraniteProvider()
        resp = provider.generate("Judge", "test")

        self.assertEqual(resp.provider, "granite")
        self.assertEqual(resp.content, "retry success")
        self.assertEqual(mock_urlopen.call_count, 2)


if __name__ == "__main__":
    unittest.main()

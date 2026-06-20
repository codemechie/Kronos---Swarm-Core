from __future__ import annotations

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
        self.assertIn("High-risk pattern detected", resp.content)

    def test_nominal_prompt(self) -> None:
        resp = self.provider.generate("Judge", "Everything is normal")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("Nominal conditions observed", resp.content)

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
        self.assertIn("High-risk pattern detected", resp.content)

    def test_mock_mode_nominal(self) -> None:
        gate = LLMGateway()
        resp = gate.generate("Judge", "all clear")
        self.assertEqual(resp.provider, "mock")
        self.assertIn("Nominal conditions", resp.content)


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
        self.assertIn("High-risk pattern detected", resp.content)

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


if __name__ == "__main__":
    unittest.main()

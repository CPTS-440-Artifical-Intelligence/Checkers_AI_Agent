from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CLI_ROOT = ROOT.parent / "checkers_cli"
SHARED_CONFIG_PATH = ROOT.parent / "shared" / "checkers_ai_config.json"

if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
if str(CLI_ROOT) not in sys.path:
    sys.path.insert(0, str(CLI_ROOT))

from api.domain.models import AgentConfig  # noqa: E402
from api.shared_ai_config import SHARED_AI_ENGINE_CONFIG as API_SHARED_AI_ENGINE_CONFIG  # noqa: E402
from shared_ai_config import SHARED_AI_ENGINE_CONFIG as CLI_SHARED_AI_ENGINE_CONFIG  # noqa: E402


class SharedAIConfigTests(unittest.TestCase):
    def test_shared_file_drives_api_and_cli_defaults(self) -> None:
        with SHARED_CONFIG_PATH.open("r", encoding="utf-8") as config_file:
            payload = json.load(config_file)

        self.assertEqual(payload["engine"]["type"], API_SHARED_AI_ENGINE_CONFIG.type)
        self.assertEqual(payload["engine"]["max_depth"], API_SHARED_AI_ENGINE_CONFIG.max_depth)
        self.assertEqual(payload["engine"]["time_limit_ms"], API_SHARED_AI_ENGINE_CONFIG.time_limit_ms)
        self.assertEqual(payload["engine"]["seed"], API_SHARED_AI_ENGINE_CONFIG.seed)

        self.assertEqual(API_SHARED_AI_ENGINE_CONFIG.type, CLI_SHARED_AI_ENGINE_CONFIG.type)
        self.assertEqual(API_SHARED_AI_ENGINE_CONFIG.max_depth, CLI_SHARED_AI_ENGINE_CONFIG.max_depth)
        self.assertEqual(API_SHARED_AI_ENGINE_CONFIG.time_limit_ms, CLI_SHARED_AI_ENGINE_CONFIG.time_limit_ms)
        self.assertEqual(API_SHARED_AI_ENGINE_CONFIG.seed, CLI_SHARED_AI_ENGINE_CONFIG.seed)
        self.assertEqual(AgentConfig().type, payload["engine"]["type"])
        self.assertEqual(AgentConfig().max_depth, payload["engine"]["max_depth"])
        self.assertEqual(AgentConfig().time_limit_ms, payload["engine"]["time_limit_ms"])
        self.assertEqual(AgentConfig().seed, payload["engine"]["seed"])


if __name__ == "__main__":
    unittest.main(verbosity=2)

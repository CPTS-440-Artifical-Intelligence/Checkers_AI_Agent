from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.engine.module_adapter import (  # noqa: E402
    CheckersCliEngineAdapter,
    EngineAdapterConfigurationError,
    EngineModuleAdapter,
    build_engine_port,
)


class EnginePortSelectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_mode = os.environ.get("CHECKERS_API_ENGINE_MODE")
        self._old_module = os.environ.get("CHECKERS_ENGINE_MODULE")

    def tearDown(self) -> None:
        if self._old_mode is None:
            os.environ.pop("CHECKERS_API_ENGINE_MODE", None)
        else:
            os.environ["CHECKERS_API_ENGINE_MODE"] = self._old_mode

        if self._old_module is None:
            os.environ.pop("CHECKERS_ENGINE_MODULE", None)
        else:
            os.environ["CHECKERS_ENGINE_MODULE"] = self._old_module

    def test_default_module_returns_checkers_cli_adapter(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "external"
        os.environ.pop("CHECKERS_ENGINE_MODULE", None)
        engine = build_engine_port()
        self.assertIsInstance(engine, CheckersCliEngineAdapter)

    def test_external_mode_returns_module_adapter(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "external"
        os.environ["CHECKERS_ENGINE_MODULE"] = "engine.api_contract"
        engine = build_engine_port()
        self.assertIsInstance(engine, EngineModuleAdapter)

    def test_external_mode_raises_when_module_missing(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "external"
        os.environ["CHECKERS_ENGINE_MODULE"] = "engine.module_that_does_not_exist"
        with self.assertRaises(ModuleNotFoundError):
            build_engine_port()

    def test_invalid_mode_is_rejected(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "default"
        with self.assertRaises(EngineAdapterConfigurationError):
            build_engine_port()


if __name__ == "__main__":
    unittest.main(verbosity=2)


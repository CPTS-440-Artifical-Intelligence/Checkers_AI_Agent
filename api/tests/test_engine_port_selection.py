from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.engine.default_engine import DefaultCheckersEngine  # noqa: E402
from api.engine.module_adapter import build_engine_port  # noqa: E402


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

    def test_default_mode_uses_fallback_engine(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "default"
        engine = build_engine_port()
        self.assertIsInstance(engine, DefaultCheckersEngine)

    def test_auto_mode_falls_back_when_external_module_missing(self) -> None:
        os.environ["CHECKERS_API_ENGINE_MODE"] = "auto"
        os.environ["CHECKERS_ENGINE_MODULE"] = "engine.module_that_does_not_exist"
        engine = build_engine_port()
        self.assertIsInstance(engine, DefaultCheckersEngine)


if __name__ == "__main__":
    unittest.main(verbosity=2)


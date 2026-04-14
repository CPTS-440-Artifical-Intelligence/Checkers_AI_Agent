from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.engine.module_adapter import (  # noqa: E402
    CheckersCliEngineAdapter,
    build_engine_port,
)


class EnginePortSelectionTests(unittest.TestCase):
    def test_build_engine_port_returns_checkers_cli_adapter(self) -> None:
        engine = build_engine_port()
        self.assertIsInstance(engine, CheckersCliEngineAdapter)


if __name__ == "__main__":
    unittest.main(verbosity=2)


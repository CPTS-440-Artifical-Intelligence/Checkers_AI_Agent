from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from engine import api_contract


class TemplateModeTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_value = os.environ.get("CHECKERS_ENGINE_TEMPLATE_MODE")
        os.environ["CHECKERS_ENGINE_TEMPLATE_MODE"] = "1"

    def tearDown(self) -> None:
        if self._old_value is None:
            os.environ.pop("CHECKERS_ENGINE_TEMPLATE_MODE", None)
        else:
            os.environ["CHECKERS_ENGINE_TEMPLATE_MODE"] = self._old_value

    def test_template_new_game_uses_imported_state(self) -> None:
        state = api_contract.new_game("template01")
        self.assertEqual(state["board"][4][2], "r")
        self.assertEqual(state["board"][2][3], "b")
        self.assertEqual(state["turn"], "red")

    def test_template_move_can_relocate_piece_to_any_square(self) -> None:
        state = api_contract.new_game("template02")
        next_state, move_result = api_contract.apply_move(state, [[4, 2], [0, 0]])
        self.assertEqual(next_state["board"][4][2], ".")
        self.assertEqual(next_state["board"][0][0], "r")
        self.assertEqual(next_state["turn"], "black")
        self.assertEqual(move_result["path"], [[4, 2], [0, 0]])

    def test_template_legal_moves_are_generated_for_wiring(self) -> None:
        state = api_contract.new_game("template03")
        legal_moves = api_contract.get_legal_moves(state)
        self.assertIn([[4, 2], [0, 0]], legal_moves)
        self.assertIn([[4, 2], [2, 3]], legal_moves)


if __name__ == "__main__":
    unittest.main(verbosity=2)

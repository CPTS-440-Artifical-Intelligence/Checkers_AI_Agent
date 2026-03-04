from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from engine import api_contract


class APIContractSmokeTests(unittest.TestCase):
    def test_new_game_shape(self) -> None:
        state = api_contract.new_game("abc12345")
        self.assertEqual(state["game_id"], "abc12345")
        self.assertEqual(state["turn"], "red")
        self.assertEqual(state["status"], "in_progress")
        self.assertEqual(len(state["board"]), 8)
        self.assertTrue(all(len(row) == 8 for row in state["board"]))

    def test_first_move_flow(self) -> None:
        state = api_contract.new_game("abcd1234")
        legal_moves = api_contract.get_legal_moves(state)
        self.assertGreater(len(legal_moves), 0)

        next_state, move_result = api_contract.apply_move(state, legal_moves[0])
        self.assertEqual(next_state["turn"], "black")
        self.assertIn("path", move_result)
        self.assertIn("captures", move_result)
        self.assertIn("promoted", move_result)

    def test_ai_move_uses_metrics_shape(self) -> None:
        state = api_contract.new_game("a1b2c3d4")
        path, metrics = api_contract.choose_ai_move(
            state,
            {"type": "alphabeta", "max_depth": 4, "time_limit_ms": 300, "seed": 2},
        )
        self.assertIsInstance(path, list)
        for key in ("depth_reached", "nodes_expanded", "prunes", "time_ms"):
            self.assertIn(key, metrics)


if __name__ == "__main__":
    unittest.main(verbosity=2)

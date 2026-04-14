from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.domain.models import AgentConfig  # noqa: E402
from api.engine.module_adapter import CheckersCliEngineAdapter  # noqa: E402


class CheckersCliEngineAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.adapter = CheckersCliEngineAdapter.from_repo_package()

    def test_new_game_state_matches_existing_api_contract(self) -> None:
        state = self.adapter.new_game_state("game1234")

        self.assertEqual(state.game_id, "game1234")
        self.assertEqual(state.turn, "red")
        self.assertEqual(state.status, "in_progress")
        self.assertIsNone(state.winner)
        self.assertFalse(state.must_capture)
        self.assertIsNone(state.last_move)
        self.assertEqual(len(state.board), 6)
        self.assertTrue(all(len(row) == 6 for row in state.board))
        self.assertEqual(state.board[5][0], "r")
        self.assertEqual(state.board[0][1], "b")

    def test_legal_moves_are_returned_in_api_coordinates(self) -> None:
        state = self.adapter.new_game_state("game1234")

        legal_moves = self.adapter.list_legal_moves(state)

        self.assertGreater(len(legal_moves), 0)
        self.assertTrue(all(len(path) >= 2 for path in legal_moves))
        self.assertTrue(all(path[0][0] >= path[1][0] for path in legal_moves))

    def test_apply_move_updates_turn_and_last_move(self) -> None:
        state = self.adapter.new_game_state("game1234")
        chosen_path = self.adapter.list_legal_moves(state)[0]

        next_state, last_move = self.adapter.apply_move(state, chosen_path)

        self.assertEqual(next_state.turn, "black")
        self.assertIsNotNone(next_state.last_move)
        self.assertEqual(last_move.path, chosen_path)
        self.assertEqual(next_state.last_move.path, chosen_path)

    def test_choose_ai_move_returns_legal_path_and_metrics(self) -> None:
        state = self.adapter.new_game_state("game1234")
        legal_moves = self.adapter.list_legal_moves(state)

        chosen_path, metrics = self.adapter.choose_ai_move(
            state,
            AgentConfig(type="alphabeta", max_depth=2, time_limit_ms=500, seed=7),
        )

        self.assertIn(chosen_path, legal_moves)
        self.assertGreaterEqual(metrics.depth_reached, 0)
        self.assertGreater(metrics.nodes_expanded, 0)
        self.assertGreater(metrics.time_ms, 0)


if __name__ == "__main__":
    unittest.main(verbosity=2)

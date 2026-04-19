from __future__ import annotations

import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
CLI_ROOT = ROOT.parent / "checkers_cli"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))
if str(CLI_ROOT) not in sys.path:
    sys.path.insert(0, str(CLI_ROOT))

from api.domain.models import AgentConfig  # noqa: E402
from api.engine.module_adapter import CheckersCliEngineAdapter  # noqa: E402
from checkers_engine.checkers_board import Board, WHITE_MAN  # noqa: E402
from checkers_engine.minimax_algo import CheckersMinimax  # noqa: E402


class CheckersCliEngineAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.adapter = CheckersCliEngineAdapter.from_repo_package()
        cls.max_depth_config = AgentConfig(type="alphabeta", max_depth=5, time_limit_ms=1_000, seed=7)

    def assertBoardMatches(self, state, board) -> None:
        translated = self.adapter._state_to_board(state)
        self.assertEqual(translated.turn, board.turn)
        self.assertEqual(translated.squares, board.squares)

    def assertLegalMovesMatch(self, state, board) -> None:
        translated_moves = self.adapter.list_legal_moves(state)
        engine_moves = [self.adapter._move_to_api_path(move) for move in board.get_legal_moves()]
        self.assertEqual(translated_moves, engine_moves)

    def resolve_direct_ai_path(self, board: Board, depth: int | None = None) -> list[tuple[int, int]]:
        search_depth = self.max_depth_config.max_depth if depth is None else depth
        mapped_result, _depth, _nodes, _score = CheckersMinimax.heuristic_alpha_beta_minimax(
            search_depth,
            board,
            board.turn == WHITE_MAN,
        )
        direct_move = self.adapter._resolve_ai_move(board, mapped_result)
        return self.adapter._move_to_api_path(direct_move)

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

    def test_round_trip_preserves_board_and_legal_moves_through_replay(self) -> None:
        state = self.adapter.new_game_state("game1234")
        board = Board.new_game()
        saw_king = False

        for ply in range(1, 19):
            self.assertBoardMatches(state, board)
            self.assertLegalMovesMatch(state, board)
            saw_king = saw_king or any(abs(piece) == 2 for piece in board.squares)

            if board.turn == WHITE_MAN:
                chosen_path, _metrics = self.adapter.choose_ai_move(state, self.max_depth_config)
                direct_path = self.resolve_direct_ai_path(board)
                self.assertEqual(chosen_path, direct_path, f"AI path diverged at ply {ply}")
                state, _last_move = self.adapter.apply_move(state, chosen_path)
                board = board.apply_move(self.adapter._resolve_move(board, chosen_path))
                continue

            selected_move = board.get_legal_moves()[0]
            api_path = self.adapter._move_to_api_path(selected_move)
            state, _last_move = self.adapter.apply_move(state, api_path)
            board = board.apply_move(selected_move)

        self.assertTrue(saw_king, "Replay should exercise at least one promotion/king state.")

    def test_sparse_black_turn_position_from_ui_has_legal_moves(self) -> None:
        state = self.adapter.new_game_state("game1234")
        state.board = [
            [".", "b", ".", "b", ".", "b"],
            ["r", ".", ".", ".", ".", "."],
            [".", ".", ".", "b", ".", "."],
            ["r", ".", ".", ".", "b", "."],
            [".", "r", ".", ".", ".", "r"],
            [".", ".", "r", ".", "r", "."],
        ]
        state.turn = "black"
        state.status = "in_progress"
        state.winner = None
        state.must_capture = False
        state.last_move = None

        legal_moves = self.adapter.list_legal_moves(state)

        self.assertEqual(
            legal_moves,
            [
                [(3, 4), (4, 3)],
                [(2, 3), (3, 2)],
                [(0, 5), (1, 4)],
                [(0, 3), (1, 4)],
                [(0, 3), (1, 2)],
                [(0, 1), (1, 2)],
            ],
        )

    def test_choose_ai_move_handles_logged_promotion_position(self) -> None:
        state = self.adapter.new_game_state("game1234")
        state.board = [
            [".", "b", ".", "b", ".", "R"],
            ["r", ".", ".", ".", ".", "."],
            [".", ".", ".", ".", ".", "."],
            ["r", ".", ".", ".", "b", "."],
            [".", ".", ".", "r", ".", "r"],
            [".", ".", "r", ".", ".", "."],
        ]
        state.turn = "black"
        state.status = "in_progress"
        state.winner = None
        state.must_capture = False
        state.last_move = None

        legal_moves = self.adapter.list_legal_moves(state)
        chosen_path, metrics = self.adapter.choose_ai_move(state, self.max_depth_config)

        self.assertEqual(
            legal_moves,
            [
                [(0, 3), (1, 4)],
                [(0, 3), (1, 2)],
                [(0, 1), (1, 2)],
            ],
        )
        self.assertIn(chosen_path, legal_moves)
        self.assertGreater(metrics.nodes_expanded, 0)

    def test_same_pre_promotion_position_matches_direct_engine_when_depth_matches(self) -> None:
        state = self.adapter.new_game_state("game1234")
        state.board = [
            [".", "b", ".", ".", ".", "."],
            ["b", ".", ".", ".", "b", "."],
            [".", ".", ".", ".", ".", "."],
            [".", ".", "r", ".", "r", "."],
            [".", ".", ".", "b", ".", "."],
            ["r", ".", ".", ".", ".", "."],
        ]
        state.turn = "black"
        state.status = "in_progress"
        state.winner = None
        state.must_capture = False
        state.last_move = None

        board = self.adapter._state_to_board(state)
        depth6_config = AgentConfig(type="alphabeta", max_depth=6, time_limit_ms=800, seed=7)
        depth15_config = AgentConfig(type="alphabeta", max_depth=15, time_limit_ms=800, seed=7)

        api_depth6_path, _depth6_metrics = self.adapter.choose_ai_move(state, depth6_config)
        api_depth15_path, _depth15_metrics = self.adapter.choose_ai_move(state, depth15_config)
        direct_depth6_path = self.resolve_direct_ai_path(board, depth=depth6_config.max_depth)
        direct_depth15_path = self.resolve_direct_ai_path(board, depth=depth15_config.max_depth)

        self.assertEqual(api_depth6_path, direct_depth6_path)
        self.assertEqual(api_depth15_path, direct_depth15_path)
        self.assertNotEqual(
            api_depth6_path,
            api_depth15_path,
            "This position should demonstrate that depth 6 and depth 15 can choose different legal moves.",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)

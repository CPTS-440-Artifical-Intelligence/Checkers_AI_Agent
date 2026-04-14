from __future__ import annotations

import sys
import types
import unittest
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.domain.models import AgentConfig  # noqa: E402
from api.engine.module_adapter import EngineModuleAdapter  # noqa: E402


def _new_state(game_id: str) -> dict[str, Any]:
    return {
        "game_id": game_id,
        "board": [["." for _ in range(6)] for _ in range(6)],
        "turn": "red",
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": None,
    }


class EngineModuleAdapterTests(unittest.TestCase):
    def test_new_game_works_with_no_arg_provider(self) -> None:
        module = types.ModuleType("fake_engine")
        module.new_game = lambda: _new_state("placeholder")
        module.get_legal_moves = lambda _state: []
        module.apply_move = lambda state, path: (
            {**state, "last_move": {"path": path, "captures": [], "promoted": False}},
            {"path": path, "captures": [], "promoted": False},
        )
        module.choose_ai_move = lambda _state, _config: (
            [[5, 0], [4, 1]],
            {"depth_reached": 4, "nodes_expanded": 12, "prunes": 3, "time_ms": 8},
        )

        adapter = EngineModuleAdapter(module)
        state = adapter.new_game_state("abc12345")
        self.assertEqual(state.game_id, "abc12345")

    def test_apply_move_maps_state_and_last_move(self) -> None:
        module = types.ModuleType("fake_engine")
        module.new_game = lambda game_id: _new_state(game_id)
        module.get_legal_moves = lambda _state: [[[5, 0], [4, 1]]]
        module.apply_move = lambda state, path: (
            {
                **state,
                "turn": "black",
                "last_move": {"path": path, "captures": [], "promoted": False},
            },
            {"path": path, "captures": [], "promoted": False},
        )
        module.choose_ai_move = lambda _state, _config: (
            [[5, 0], [4, 1]],
            {"depth_reached": 4, "nodes_expanded": 12, "prunes": 3, "time_ms": 8},
        )

        adapter = EngineModuleAdapter(module)
        state = adapter.new_game_state("a1b2c3d4")
        next_state, last_move = adapter.apply_move(state, [(5, 0), (4, 1)])
        self.assertEqual(next_state.turn, "black")
        self.assertEqual(last_move.path, [(5, 0), (4, 1)])

    def test_choose_ai_move_maps_metrics(self) -> None:
        module = types.ModuleType("fake_engine")
        module.new_game = lambda game_id: _new_state(game_id)
        module.get_legal_moves = lambda _state: [[[5, 0], [4, 1]]]
        module.apply_move = lambda state, path: (
            {**state, "last_move": {"path": path, "captures": [], "promoted": False}},
            {"path": path, "captures": [], "promoted": False},
        )
        module.choose_ai_move = lambda _state, _config: (
            [[5, 0], [4, 1]],
            {"depth_reached": 6, "nodes_expanded": 1000, "prunes": 250, "time_ms": 70},
        )

        adapter = EngineModuleAdapter(module)
        state = adapter.new_game_state("abcd1234")
        path, metrics = adapter.choose_ai_move(state, AgentConfig(max_depth=6))
        self.assertEqual(path, [(5, 0), (4, 1)])
        self.assertEqual(metrics.depth_reached, 6)
        self.assertEqual(metrics.nodes_expanded, 1000)


if __name__ == "__main__":
    unittest.main(verbosity=2)


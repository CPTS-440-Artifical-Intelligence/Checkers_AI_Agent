from __future__ import annotations

from typing import Any

from engine.runtime import apply_move as _apply_move
from engine.runtime import choose_ai_move as _choose_ai_move
from engine.runtime import get_legal_moves as _get_legal_moves
from engine.runtime import new_game as _new_game


def new_game(game_id: str) -> dict[str, Any]:
    """
    Create a fresh game state.

    Expected return shape:
    {
      "game_id": "abc12345",
      "board": [[".", "b", ...], ...],  # 8x8
      "turn": "red" | "black",
      "status": "in_progress" | "finished",
      "winner": None | "red" | "black",
      "must_capture": bool,
      "last_move": None | {
        "path": [[r, c], ...],
        "captures": [[r, c], ...],
        "promoted": bool
      }
    }
    """
    return _new_game(game_id)


def get_legal_moves(state: dict[str, Any]) -> list[list[list[int]]]:
    """
    Return all legal moves for the current player.

    Expected shape:
    [
      [[r0, c0], [r1, c1]],
      [[r0, c0], [r1, c1], [r2, c2]]
    ]
    """
    return _get_legal_moves(state)


def apply_move(
    state: dict[str, Any],
    path: list[list[int]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Apply a legal move path and return `(next_state, move_result)`.

    `move_result` shape:
    {
      "path": [[r, c], ...],
      "captures": [[r, c], ...],
      "promoted": bool
    }
    """
    return _apply_move(state, path)


def choose_ai_move(
    state: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[list[int]], dict[str, int]]:
    """
    Choose one move for the active side and return `(path, metrics)`.

    `config` keys from API:
    - type: str
    - max_depth: int
    - time_limit_ms: int
    - seed: int | None

    `metrics` expected keys:
    - depth_reached
    - nodes_expanded
    - prunes
    - time_ms
    """
    return _choose_ai_move(state, config)


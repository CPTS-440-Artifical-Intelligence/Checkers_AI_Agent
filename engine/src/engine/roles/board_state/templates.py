from __future__ import annotations

import copy
from typing import Any

TEMPLATE_BOARD: list[list[str]] = [
    [".", ".", ".", ".", ".", "."],
    [".", ".", "B", ".", ".", "."],
    [".", ".", ".", "b", ".", "."],
    [".", ".", ".", ".", ".", "."],
    [".", ".", "r", ".", ".", "."],
    [".", "R", ".", ".", ".", "."],
]


def build_template_state(game_id: str) -> dict[str, Any]:
    """
    Imported starter state for front-to-back wiring tests.
    """
    return {
        "game_id": game_id,
        "board": copy.deepcopy(TEMPLATE_BOARD),
        "turn": "red",
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": None,
    }

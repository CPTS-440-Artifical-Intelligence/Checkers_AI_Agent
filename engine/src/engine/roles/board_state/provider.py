from __future__ import annotations

from typing import Any

CAPTAIN = "Jamil Staten"
ROLE = "Data Structure Of Board"


def _build_initial_board() -> list[list[str]]:
    """
    Create standard 8x8 checkers starting board.
    - Black pieces on rows 0-2
    - Red pieces on rows 5-7
    - Only on dark squares (row + col) % 2 == 1
    """
    board = []

    for row in range(8):
        current_row = []
        for col in range(8):
            if (row + col) % 2 == 1:
                # dark square
                if row < 3:
                    current_row.append("b")  # black piece
                elif row > 4:
                    current_row.append("r")  # red piece
                else:
                    current_row.append(".")
            else:
                current_row.append(".")
        board.append(current_row)

    return board


def new_game_state(game_id: str) -> dict[str, Any]:
    """
    Build the canonical initial state dictionary.
    """

    board = _build_initial_board()

    return {
        "game_id": game_id,
        "board": board,
        "turn": "red",  # standard: red starts
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": None,
    }
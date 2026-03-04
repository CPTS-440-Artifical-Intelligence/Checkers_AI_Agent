from __future__ import annotations

import copy
from typing import Any

_BOARD_SIZE = 8
_RED_PIECES = {"r", "R"}
_BLACK_PIECES = {"b", "B"}


def _owner(piece: str) -> str | None:
    if piece in _RED_PIECES:
        return "red"
    if piece in _BLACK_PIECES:
        return "black"
    return None


def _opponent(turn: str) -> str:
    return "black" if turn == "red" else "red"


def _all_coords() -> list[tuple[int, int]]:
    return [(row, col) for row in range(_BOARD_SIZE) for col in range(_BOARD_SIZE)]


def template_legal_moves(state: dict[str, Any]) -> list[list[list[int]]]:
    """
    Wiring template: allow moving any active-side piece to any other square.
    """
    turn = str(state["turn"])
    board = state["board"]
    moves: list[list[list[int]]] = []
    destinations = _all_coords()
    for row in range(_BOARD_SIZE):
        for col in range(_BOARD_SIZE):
            if _owner(board[row][col]) != turn:
                continue
            for dst_row, dst_col in destinations:
                if dst_row == row and dst_col == col:
                    continue
                moves.append([[row, col], [dst_row, dst_col]])
    return moves


def _piece_counts(board: list[list[str]]) -> tuple[int, int]:
    red = 0
    black = 0
    for row in board:
        for piece in row:
            if piece in _RED_PIECES:
                red += 1
            elif piece in _BLACK_PIECES:
                black += 1
    return red, black


def _update_status(next_state: dict[str, Any]) -> None:
    red_count, black_count = _piece_counts(next_state["board"])
    if red_count == 0:
        next_state["status"] = "finished"
        next_state["winner"] = "black"
        return
    if black_count == 0:
        next_state["status"] = "finished"
        next_state["winner"] = "red"
        return
    next_state["status"] = "in_progress"
    next_state["winner"] = None


def template_apply_move(
    state: dict[str, Any],
    path: list[list[int]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Wiring template: relocate one piece from source to destination.
    """
    if len(path) < 2:
        raise ValueError("Template move path must have at least two coordinates.")

    start_row, start_col = path[0]
    dst_row, dst_col = path[-1]
    board = copy.deepcopy(state["board"])
    turn = str(state["turn"])
    moving_piece = board[start_row][start_col]
    if _owner(moving_piece) != turn:
        raise ValueError("Selected piece does not belong to active side.")

    destination_piece = board[dst_row][dst_col]
    captures: list[list[int]] = []
    if _owner(destination_piece) == _opponent(turn):
        captures.append([dst_row, dst_col])

    board[start_row][start_col] = "."
    board[dst_row][dst_col] = moving_piece

    normalized_path = [[start_row, start_col], [dst_row, dst_col]]
    move_result: dict[str, Any] = {
        "path": normalized_path,
        "captures": captures,
        "promoted": False,
    }
    next_state: dict[str, Any] = {
        "game_id": str(state["game_id"]),
        "board": board,
        "turn": _opponent(turn),
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": move_result,
    }
    _update_status(next_state)
    return next_state, move_result

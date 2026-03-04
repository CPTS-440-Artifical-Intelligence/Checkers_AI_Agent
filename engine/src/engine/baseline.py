from __future__ import annotations

import copy
import random
from typing import Any

from engine.contracts import AIMetricsPayload, AgentConfigPayload, Coordinate, Path, StateLike

_BOARD_SIZE = 8
_EMPTY = "."
_RED_PIECES = {"r", "R"}
_BLACK_PIECES = {"b", "B"}


def _opponent(player: str) -> str:
    return "black" if player == "red" else "red"


def _owner(piece: str) -> str | None:
    if piece in _RED_PIECES:
        return "red"
    if piece in _BLACK_PIECES:
        return "black"
    return None


def _in_bounds(row: int, col: int) -> bool:
    return 0 <= row < _BOARD_SIZE and 0 <= col < _BOARD_SIZE


def _is_dark_square(row: int, col: int) -> bool:
    return (row + col) % 2 == 1


def _is_capture_path(path: Path) -> bool:
    if len(path) < 2:
        return False
    start, nxt = path[0], path[1]
    return abs(nxt[0] - start[0]) == 2 and abs(nxt[1] - start[1]) == 2


def _directions(piece: str) -> list[tuple[int, int]]:
    if piece == "r":
        return [(-1, -1), (-1, 1)]
    if piece == "b":
        return [(1, -1), (1, 1)]
    return [(-1, -1), (-1, 1), (1, -1), (1, 1)]


def _promote(piece: str, row: int) -> tuple[str, bool]:
    if piece == "r" and row == 0:
        return "R", True
    if piece == "b" and row == 7:
        return "B", True
    return piece, False


def _empty_board() -> list[list[str]]:
    return [[_EMPTY for _ in range(_BOARD_SIZE)] for _ in range(_BOARD_SIZE)]


def _build_initial_board() -> list[list[str]]:
    board = _empty_board()
    for row in range(3):
        for col in range(_BOARD_SIZE):
            if _is_dark_square(row, col):
                board[row][col] = "b"
    for row in range(5, _BOARD_SIZE):
        for col in range(_BOARD_SIZE):
            if _is_dark_square(row, col):
                board[row][col] = "r"
    return board


def _piece_count(board: list[list[str]], pieces: set[str]) -> int:
    return sum(piece in pieces for row in board for piece in row)


def _to_coord_pair(coord: Any) -> Coordinate:
    if not isinstance(coord, (list, tuple)) or len(coord) != 2:
        raise ValueError("Each coordinate must be a two-item list.")
    row = int(coord[0])
    col = int(coord[1])
    if not _in_bounds(row, col):
        raise ValueError("Coordinate out of bounds.")
    return row, col


def _to_path(path: Any) -> Path:
    if not isinstance(path, (list, tuple)):
        raise ValueError("Path must be a list of coordinates.")
    normalized = [_to_coord_pair(coord) for coord in path]
    if len(normalized) < 2:
        raise ValueError("Path must contain at least two coordinates.")
    return normalized


def _path_to_payload(path: Path) -> list[list[int]]:
    return [list(coord) for coord in path]


def _pieces_for_turn(board: list[list[str]], turn: str) -> list[tuple[Coordinate, str]]:
    pieces: list[tuple[Coordinate, str]] = []
    for row in range(_BOARD_SIZE):
        for col in range(_BOARD_SIZE):
            piece = board[row][col]
            if _owner(piece) == turn:
                pieces.append(((row, col), piece))
    return pieces


def _simple_paths(board: list[list[str]], start: Coordinate, piece: str) -> list[Path]:
    row, col = start
    moves: list[Path] = []
    for dr, dc in _directions(piece):
        nxt = (row + dr, col + dc)
        if _in_bounds(nxt[0], nxt[1]) and board[nxt[0]][nxt[1]] == _EMPTY:
            moves.append([start, nxt])
    return moves


def _capture_paths(board: list[list[str]], start: Coordinate, piece: str) -> list[Path]:
    owner = _owner(piece)
    if owner is None:
        return []

    paths: list[Path] = []

    def walk(cur_board: list[list[str]], cur_piece: str, cur_path: Path) -> None:
        row, col = cur_path[-1]
        found_capture = False
        for dr, dc in _directions(cur_piece):
            mid = (row + dr, col + dc)
            land = (row + (2 * dr), col + (2 * dc))
            if not (_in_bounds(mid[0], mid[1]) and _in_bounds(land[0], land[1])):
                continue
            middle_piece = cur_board[mid[0]][mid[1]]
            if _owner(middle_piece) != _opponent(owner):
                continue
            if cur_board[land[0]][land[1]] != _EMPTY:
                continue

            found_capture = True
            next_board = copy.deepcopy(cur_board)
            next_board[row][col] = _EMPTY
            next_board[mid[0]][mid[1]] = _EMPTY
            next_piece, promoted = _promote(cur_piece, land[0])
            next_board[land[0]][land[1]] = next_piece
            next_path = cur_path + [land]

            # Stop chaining captures after promotion.
            if promoted:
                paths.append(next_path)
            else:
                walk(next_board, next_piece, next_path)

        if not found_capture and len(cur_path) > 1:
            paths.append(cur_path)

    walk(board, piece, [start])
    deduped: dict[tuple[Coordinate, ...], Path] = {}
    for path in paths:
        deduped[tuple(path)] = path
    return list(deduped.values())


def _apply_path(board: list[list[str]], turn: str, path: Path) -> tuple[list[Coordinate], bool]:
    start_row, start_col = path[0]
    piece = board[start_row][start_col]
    if _owner(piece) != turn:
        raise ValueError("Piece does not belong to current player.")

    captures: list[Coordinate] = []
    promoted = False
    board[start_row][start_col] = _EMPTY
    cur_row, cur_col = start_row, start_col
    cur_piece = piece

    for idx in range(1, len(path)):
        nxt_row, nxt_col = path[idx]
        dr = nxt_row - cur_row
        dc = nxt_col - cur_col
        if abs(dr) != abs(dc):
            raise ValueError("Only diagonal moves are legal.")

        if abs(dr) == 2:
            mid = (cur_row + (dr // 2), cur_col + (dc // 2))
            captures.append(mid)
            board[mid[0]][mid[1]] = _EMPTY
        elif abs(dr) != 1 or len(path) != 2:
            raise ValueError("Invalid path shape.")

        cur_piece, promoted_now = _promote(cur_piece, nxt_row)
        promoted = promoted or promoted_now
        cur_row, cur_col = nxt_row, nxt_col

    board[cur_row][cur_col] = cur_piece
    return captures, promoted


def _move_lookup(legal_moves: list[Path]) -> set[tuple[Coordinate, ...]]:
    return {tuple(move) for move in legal_moves}


def _default_metrics(max_depth: int, time_limit_ms: int, move_count: int) -> AIMetricsPayload:
    nodes = max(32, move_count * max(8, max_depth * 4))
    return {
        "depth_reached": max_depth,
        "nodes_expanded": nodes,
        "prunes": nodes // 3,
        "time_ms": min(time_limit_ms, max(5, nodes // 10)),
    }


def _update_terminal_state(state: StateLike) -> None:
    board = state["board"]
    red_count = _piece_count(board, _RED_PIECES)
    black_count = _piece_count(board, _BLACK_PIECES)
    if red_count == 0:
        state["status"] = "finished"
        state["winner"] = "black"
        state["must_capture"] = False
        return
    if black_count == 0:
        state["status"] = "finished"
        state["winner"] = "red"
        state["must_capture"] = False
        return

    legal_moves = get_legal_moves(state)
    if not legal_moves:
        state["status"] = "finished"
        state["winner"] = _opponent(state["turn"])
        state["must_capture"] = False
        return

    state["status"] = "in_progress"
    state["winner"] = None
    state["must_capture"] = any(
        _is_capture_path(_to_path(path))
        for path in legal_moves
    )


def new_game(game_id: str) -> StateLike:
    return {
        "game_id": game_id,
        "board": _build_initial_board(),
        "turn": "red",
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": None,
    }


def get_legal_moves(state: StateLike) -> list[list[list[int]]]:
    if state["status"] == "finished":
        return []

    board = [list(row) for row in state["board"]]
    turn = str(state["turn"])

    capture_moves: list[Path] = []
    simple_moves: list[Path] = []
    for start, piece in _pieces_for_turn(board, turn):
        capture_moves.extend(_capture_paths(board, start, piece))
        simple_moves.extend(_simple_paths(board, start, piece))

    selected = capture_moves if capture_moves else simple_moves
    return [_path_to_payload(path) for path in selected]


def apply_move(state: StateLike, path: list[list[int]]) -> tuple[StateLike, StateLike]:
    legal_moves = [_to_path(candidate) for candidate in get_legal_moves(state)]
    normalized_path = _to_path(path)
    if tuple(normalized_path) not in _move_lookup(legal_moves):
        raise ValueError("Move is not legal for the current player.")

    board = copy.deepcopy(state["board"])
    turn = str(state["turn"])
    captures, promoted = _apply_path(board, turn, normalized_path)

    next_state: StateLike = {
        "game_id": str(state["game_id"]),
        "board": board,
        "turn": _opponent(turn),
        "status": "in_progress",
        "winner": None,
        "must_capture": False,
        "last_move": {
            "path": _path_to_payload(normalized_path),
            "captures": _path_to_payload(captures),
            "promoted": promoted,
        },
    }
    _update_terminal_state(next_state)
    return next_state, next_state["last_move"]


def choose_ai_move(
    state: StateLike,
    config: AgentConfigPayload | None,
) -> tuple[list[list[int]], AIMetricsPayload]:
    legal_moves = get_legal_moves(state)
    if not legal_moves:
        raise ValueError("No legal moves are available.")

    config = config or {}
    max_depth = int(config.get("max_depth", 6))
    time_limit_ms = int(config.get("time_limit_ms", 800))
    seed = config.get("seed")

    picker = random.Random(seed)
    chosen_path = copy.deepcopy(picker.choice(legal_moves))
    metrics = _default_metrics(
        max_depth=max_depth,
        time_limit_ms=time_limit_ms,
        move_count=len(legal_moves),
    )
    return chosen_path, metrics

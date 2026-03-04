from __future__ import annotations

import copy
import random

from api.domain.models import AIMetrics, AgentConfig, Coordinate, GameStateData, LastMoveData, Path

_BOARD_SIZE = 8
_EMPTY = "."
_RED_PIECES = {"r", "R"}
_BLACK_PIECES = {"b", "B"}


# ---------------------------------------------------------------------------
# Primitive helpers
# ---------------------------------------------------------------------------
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


def _is_dark_square(row: int, col: int) -> bool:
    return (row + col) % 2 == 1


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


def _pieces_for_turn(board: list[list[str]], turn: str) -> list[tuple[Coordinate, str]]:
    pieces: list[tuple[Coordinate, str]] = []
    for row in range(_BOARD_SIZE):
        for col in range(_BOARD_SIZE):
            piece = board[row][col]
            if _owner(piece) == turn:
                pieces.append(((row, col), piece))
    return pieces


def _move_lookup(legal_moves: list[Path]) -> set[tuple[Coordinate, ...]]:
    return {tuple(move) for move in legal_moves}


def _piece_count(board: list[list[str]], pieces: set[str]) -> int:
    return sum(piece in pieces for row in board for piece in row)


class DefaultCheckersEngine:
    """Reference in-API engine used as default and testing fallback."""

    def new_game_state(self, game_id: str) -> GameStateData:
        return GameStateData(
            game_id=game_id,
            board=_build_initial_board(),
            turn="red",
            status="in_progress",
            winner=None,
            must_capture=False,
            last_move=None,
        )

    def list_legal_moves(self, state: GameStateData) -> list[Path]:
        if state.status == "finished":
            return []

        capture_moves: list[Path] = []
        simple_moves: list[Path] = []
        for start, piece in _pieces_for_turn(state.board, state.turn):
            capture_moves.extend(self._capture_paths(state.board, start, piece))
            simple_moves.extend(self._simple_paths(state.board, start, piece))

        return capture_moves if capture_moves else simple_moves

    def apply_move(self, state: GameStateData, path: Path) -> tuple[GameStateData, LastMoveData]:
        legal_moves = self.list_legal_moves(state)
        if not self._contains_move(legal_moves, path):
            raise ValueError("Move is not legal for the current player.")

        board = copy.deepcopy(state.board)
        captures, promoted = self._apply_path(board, state.turn, path)

        next_state = GameStateData(
            game_id=state.game_id,
            board=board,
            turn=_opponent(state.turn),
            status="in_progress",
            winner=None,
            must_capture=False,
            last_move=LastMoveData(path=path, captures=captures, promoted=promoted),
        )
        self._update_terminal_state(next_state)
        return next_state, next_state.last_move  # type: ignore[return-value]

    def choose_ai_move(self, state: GameStateData, config: AgentConfig) -> tuple[Path, AIMetrics]:
        legal_moves = self.list_legal_moves(state)
        if not legal_moves:
            raise ValueError("Game has no legal moves.")

        picker = random.Random(config.seed)
        chosen = copy.deepcopy(picker.choice(legal_moves))
        nodes = max(32, len(legal_moves) * max(8, config.max_depth * 4))
        metrics = AIMetrics(
            depth_reached=config.max_depth,
            nodes_expanded=nodes,
            prunes=nodes // 3,
            time_ms=min(config.time_limit_ms, max(5, nodes // 10)),
        )
        return chosen, metrics

    def _contains_move(self, legal_moves: list[Path], candidate: Path) -> bool:
        return tuple(candidate) in _move_lookup(legal_moves)

    def _simple_paths(self, board: list[list[str]], start: Coordinate, piece: str) -> list[Path]:
        row, col = start
        moves: list[Path] = []
        for dr, dc in _directions(piece):
            nxt = (row + dr, col + dc)
            if _in_bounds(nxt[0], nxt[1]) and board[nxt[0]][nxt[1]] == _EMPTY:
                moves.append([start, nxt])
        return moves

    def _capture_paths(self, board: list[list[str]], start: Coordinate, piece: str) -> list[Path]:
        owner = _owner(piece)
        if owner is None:
            return []

        paths: list[Path] = []

        def walk(cur_board: list[list[str]], cur_piece: str, cur_path: Path) -> None:
            row, col = cur_path[-1]
            found = False
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

                found = True
                next_board = copy.deepcopy(cur_board)
                next_board[row][col] = _EMPTY
                next_board[mid[0]][mid[1]] = _EMPTY
                next_piece, promoted = _promote(cur_piece, land[0])
                next_board[land[0]][land[1]] = next_piece
                next_path = cur_path + [land]

                # We stop chaining when a piece gets promoted.
                if promoted:
                    paths.append(next_path)
                else:
                    walk(next_board, next_piece, next_path)

            if not found and len(cur_path) > 1:
                paths.append(cur_path)

        walk(board, piece, [start])
        deduped: dict[tuple[Coordinate, ...], Path] = {}
        for path in paths:
            deduped[tuple(path)] = path
        return list(deduped.values())

    def _apply_path(self, board: list[list[str]], turn: str, path: Path) -> tuple[list[Coordinate], bool]:
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
                raise ValueError("Invalid move path shape.")

            cur_piece, promoted_now = _promote(cur_piece, nxt_row)
            promoted = promoted or promoted_now
            cur_row, cur_col = nxt_row, nxt_col

        board[cur_row][cur_col] = cur_piece
        return captures, promoted

    def _update_terminal_state(self, state: GameStateData) -> None:
        red_count = _piece_count(state.board, _RED_PIECES)
        black_count = _piece_count(state.board, _BLACK_PIECES)
        if red_count == 0:
            state.status = "finished"
            state.winner = "black"
            state.must_capture = False
            return
        if black_count == 0:
            state.status = "finished"
            state.winner = "red"
            state.must_capture = False
            return

        legal_moves = self.list_legal_moves(state)
        if not legal_moves:
            state.status = "finished"
            state.winner = _opponent(state.turn)
            state.must_capture = False
            return

        state.status = "in_progress"
        state.winner = None
        state.must_capture = any(_is_capture_path(path) for path in legal_moves)

from __future__ import annotations

import importlib
import sys
import time
from pathlib import Path
from typing import Any

from api.domain.models import AIMetrics, AgentConfig, GameStateData, LastMoveData, Path as MovePath
from api.engine.port import EnginePort


class EngineAdapterConfigurationError(RuntimeError):
    """Raised when engine adapter configuration or imports are invalid."""


def _ensure_repo_checkers_cli_path() -> None:
    """Allow importing `checkers_engine.*` from the merged CLI package."""
    repo_root = Path(__file__).resolve().parents[4]
    local_cli_root = repo_root / "checkers_cli"
    if local_cli_root.exists():
        cli_root = str(local_cli_root)
        if cli_root not in sys.path:
            sys.path.insert(0, cli_root)


# ---------------------------------------------------------------------------
# Mapping helpers (external module <-> domain types)
# ---------------------------------------------------------------------------
def _to_coord_pair(coord: Any) -> tuple[int, int]:
    if not isinstance(coord, (list, tuple)) or len(coord) != 2:
        raise ValueError("Coordinate values must be 2-item lists/tuples.")
    row, col = coord
    return int(row), int(col)


def _to_path(path: Any) -> MovePath:
    if not isinstance(path, (list, tuple)):
        raise ValueError("Path must be a list of coordinates.")
    return [_to_coord_pair(coord) for coord in path]


def _to_paths(paths: Any) -> list[MovePath]:
    if not isinstance(paths, (list, tuple)):
        raise ValueError("Legal moves must be a list of paths.")
    return [_to_path(path) for path in paths]


def _to_last_move(move_data: Any, fallback_path: MovePath) -> LastMoveData:
    if isinstance(move_data, LastMoveData):
        return move_data
    if not isinstance(move_data, dict):
        return LastMoveData(path=fallback_path, captures=[], promoted=False)

    raw_path = move_data.get("path", fallback_path)
    raw_captures = move_data.get("captures", [])
    promoted = bool(move_data.get("promoted", False))

    return LastMoveData(
        path=_to_path(raw_path),
        captures=[_to_coord_pair(coord) for coord in raw_captures],
        promoted=promoted,
    )


def _to_state(game_id: str, raw_state: Any) -> GameStateData:
    if isinstance(raw_state, GameStateData):
        if raw_state.game_id != game_id:
            raw_state.game_id = game_id
        return raw_state

    if not isinstance(raw_state, dict):
        raise ValueError("Engine state must be a dict or GameStateData instance.")

    last_move: LastMoveData | None = None
    if raw_state.get("last_move") is not None:
        last_move = _to_last_move(raw_state["last_move"], fallback_path=[])

    return GameStateData(
        game_id=game_id,
        board=[list(row) for row in raw_state["board"]],
        turn=str(raw_state["turn"]),
        status=str(raw_state.get("status", "in_progress")),
        winner=raw_state.get("winner"),
        must_capture=bool(raw_state.get("must_capture", False)),
        last_move=last_move,
    )


def _to_metrics(raw_metrics: Any, depth_hint: int) -> AIMetrics:
    if isinstance(raw_metrics, AIMetrics):
        return raw_metrics
    if isinstance(raw_metrics, dict):
        return AIMetrics(
            depth_reached=int(raw_metrics.get("depth_reached", depth_hint)),
            nodes_expanded=int(raw_metrics.get("nodes_expanded", 0)),
            prunes=int(raw_metrics.get("prunes", 0)),
            time_ms=int(raw_metrics.get("time_ms", 0)),
        )
    return AIMetrics(depth_reached=depth_hint, nodes_expanded=0, prunes=0, time_ms=0)


def _path_to_payload(path: MovePath) -> list[list[int]]:
    return [list(coord) for coord in path]


def _agent_config_to_payload(config: AgentConfig) -> dict[str, object]:
    return {
        "type": config.type,
        "max_depth": config.max_depth,
        "time_limit_ms": config.time_limit_ms,
        "seed": config.seed,
    }


def _default_move_data(path: MovePath) -> dict[str, object]:
    return {"path": _path_to_payload(path), "captures": [], "promoted": False}


class CheckersCliEngineAdapter(EnginePort):
    """
    Bridge the merged CLI engine into the API contract without modifying engine code.

    The CLI engine stores only playable squares, uses `black/white` semantics, and
    starts with black to move. The API contract expects a full 6x6 grid using
    `red/black` semantics and starts with red to move.

    To preserve the public API contract, this adapter:
    - rotates coordinates 180 degrees
    - maps CLI `black` pieces/turn to API `red`
    - maps CLI `white` pieces/turn to API `black`
    """

    def __init__(
        self,
        board_cls: type[Any],
        mapped_board_cls: type[Any],
        minimax_cls: type[Any],
        *,
        empty: int,
        black_man: int,
        black_king: int,
        white_man: int,
        white_king: int,
    ) -> None:
        self._board_cls = board_cls
        self._mapped_board_cls = mapped_board_cls
        self._minimax_cls = minimax_cls
        self._empty = empty
        self._black_man = black_man
        self._black_king = black_king
        self._white_man = white_man
        self._white_king = white_king
        self._size = int(board_cls.SIZE)

    @classmethod
    def from_repo_package(cls) -> "CheckersCliEngineAdapter":
        _ensure_repo_checkers_cli_path()
        board_module = importlib.import_module("checkers_engine.checkers_board")
        mapping_module = importlib.import_module("checkers_engine.checkerboard_mapping")
        minimax_module = importlib.import_module("checkers_engine.minimax_algo")
        return cls(
            board_cls=board_module.Board,
            mapped_board_cls=mapping_module.MappedCheckerBoard,
            minimax_cls=minimax_module.CheckersMinimax,
            empty=board_module.EMPTY,
            black_man=board_module.BLACK_MAN,
            black_king=board_module.BLACK_KING,
            white_man=board_module.WHITE_MAN,
            white_king=board_module.WHITE_KING,
        )

    def new_game_state(self, game_id: str) -> GameStateData:
        board = self._board_cls.new_game()
        return self._board_to_state(game_id, board, last_move=None)

    def list_legal_moves(self, state: GameStateData) -> list[MovePath]:
        board = self._state_to_board(state)
        return [self._move_to_api_path(move) for move in board.get_legal_moves()]

    def apply_move(self, state: GameStateData, path: MovePath) -> tuple[GameStateData, LastMoveData]:
        board = self._state_to_board(state)
        selected_move = self._resolve_move(board, path)
        original_piece = board.piece_at(selected_move.start)
        next_board = board.apply_move(selected_move)
        promoted = abs(original_piece) == 1 and abs(next_board.piece_at(selected_move.end)) == 2
        last_move = LastMoveData(
            path=self._move_to_api_path(selected_move),
            captures=self._captured_to_api_coords(selected_move.captured),
            promoted=promoted,
        )
        next_state = self._board_to_state(state.game_id, next_board, last_move=last_move)
        return next_state, last_move

    def choose_ai_move(self, state: GameStateData, config: AgentConfig) -> tuple[MovePath, AIMetrics]:
        board = self._state_to_board(state)
        if not board.get_legal_moves():
            raise ValueError("Game has no legal moves.")

        started_at = time.perf_counter()
        mapped_state, depth_reached, nodes_expanded, _score = self._minimax_cls.heuristic_alpha_beta_minimax(
            config.max_depth,
            board,
            self._is_maximizing_red_player(board.turn),
        )
        elapsed_ms = max(1, int((time.perf_counter() - started_at) * 1000))
        if mapped_state is None:
            raise ValueError("Game has no legal moves.")

        selected_move = self._resolve_ai_move(board, mapped_state)
        return self._move_to_api_path(selected_move), AIMetrics(
            depth_reached=depth_reached,
            nodes_expanded=nodes_expanded,
            prunes=0,
            time_ms=min(config.time_limit_ms, elapsed_ms),
        )

    def _state_to_board(self, state: GameStateData) -> Any:
        self._validate_grid_shape(state.board)
        squares = [self._empty] * int(self._board_cls.PLAYABLE_COUNT)
        for api_row, row in enumerate(state.board):
            for api_col, cell in enumerate(row):
                if cell == ".":
                    continue
                engine_row, engine_col = self._rotate_coord((api_row, api_col))
                index = self._board_cls.row_col_to_index(engine_row, engine_col)
                if index is None:
                    raise ValueError("Piece coordinates must map to playable dark squares.")
                squares[index] = self._api_piece_to_engine(cell)
        return self._board_cls(squares, self._api_turn_to_engine(state.turn))

    def _board_to_state(
        self,
        game_id: str,
        board: Any,
        *,
        last_move: LastMoveData | None,
    ) -> GameStateData:
        grid = [["." for _ in range(self._size)] for _ in range(self._size)]
        for index, piece in enumerate(board.squares):
            row, col = self._board_cls.index_to_row_col(index)
            api_row, api_col = self._rotate_coord((row, col))
            grid[api_row][api_col] = self._engine_piece_to_api(piece)

        winner = board.winner()
        status = "finished" if winner is not None else "in_progress"
        legal_moves = [] if status == "finished" else board.get_legal_moves()
        return GameStateData(
            game_id=game_id,
            board=grid,
            turn=self._engine_turn_to_api(board.turn),
            status=status,
            winner=None if winner is None else self._engine_turn_to_api(winner),
            must_capture=any(move.is_capture for move in legal_moves),
            last_move=last_move,
        )

    def _resolve_move(self, board: Any, path: MovePath) -> Any:
        target = self._api_path_to_engine_indices(path)
        for move in board.get_legal_moves():
            if tuple(move.path) == target:
                return move
        raise ValueError("Move is not legal for the current player.")

    def _resolve_ai_move(self, board: Any, mapped_state: Any) -> Any:
        target_key = self._mapped_state_key(mapped_state)
        exact_matches: list[Any] = []
        signature_matches: list[Any] = []

        for move, next_board in board.generate_successor_states():
            candidate = self._mapped_board_cls.generateMappingFromCheckerBoard(next_board)
            if self._mapped_state_key(candidate) == target_key:
                exact_matches.append(move)
            elif candidate.getStateSignature() == mapped_state.getStateSignature():
                signature_matches.append(move)

        if len(exact_matches) == 1:
            return exact_matches[0]
        if len(exact_matches) > 1:
            raise ValueError("AI result matched multiple legal moves; move selection is ambiguous.")
        if len(signature_matches) == 1:
            return signature_matches[0]
        raise ValueError("AI result did not map back to a unique legal move.")

    def _move_to_api_path(self, move: Any) -> MovePath:
        return [self._engine_index_to_api_coord(index) for index in move.path]

    def _captured_to_api_coords(self, captured: tuple[int, ...]) -> list[tuple[int, int]]:
        return [self._engine_index_to_api_coord(index) for index in captured]

    def _api_path_to_engine_indices(self, path: MovePath) -> tuple[int, ...]:
        indices: list[int] = []
        for coord in path:
            row, col = self._rotate_coord(coord)
            index = self._board_cls.row_col_to_index(row, col)
            if index is None:
                raise ValueError("Move coordinates must be playable dark squares.")
            indices.append(index)
        return tuple(indices)

    def _engine_index_to_api_coord(self, index: int) -> tuple[int, int]:
        return self._rotate_coord(self._board_cls.index_to_row_col(index))

    def _rotate_coord(self, coord: tuple[int, int]) -> tuple[int, int]:
        row, col = coord
        max_index = self._size - 1
        return (max_index - row, max_index - col)

    def _api_turn_to_engine(self, turn: str) -> int:
        if turn == "red":
            return self._black_man
        if turn == "black":
            return self._white_man
        raise ValueError(f"Unsupported API turn: {turn!r}")

    def _engine_turn_to_api(self, turn: int) -> str:
        if turn == self._black_man:
            return "red"
        if turn == self._white_man:
            return "black"
        raise ValueError(f"Unsupported engine turn: {turn!r}")

    def _api_piece_to_engine(self, piece: str) -> int:
        if piece == ".":
            return self._empty
        if piece == "r":
            return self._black_man
        if piece == "R":
            return self._black_king
        if piece == "b":
            return self._white_man
        if piece == "B":
            return self._white_king
        raise ValueError(f"Unsupported API piece: {piece!r}")

    def _engine_piece_to_api(self, piece: int) -> str:
        if piece == self._empty:
            return "."
        if piece == self._black_man:
            return "r"
        if piece == self._black_king:
            return "R"
        if piece == self._white_man:
            return "b"
        if piece == self._white_king:
            return "B"
        raise ValueError(f"Unsupported engine piece: {piece!r}")

    def _is_maximizing_red_player(self, engine_turn: int) -> bool:
        return engine_turn == self._white_man

    def _mapped_state_key(self, mapped_state: Any) -> tuple[int, int, int, int]:
        return (
            mapped_state.getRedCheckers(),
            mapped_state.getBlackCheckers(),
            mapped_state.getRedKingCheckers(),
            mapped_state.getBlackKingCheckers(),
        )

    def _validate_grid_shape(self, board: list[list[str]]) -> None:
        if len(board) != self._size or any(len(row) != self._size for row in board):
            raise ValueError(f"Board must be a {self._size}x{self._size} grid.")

def build_engine_port() -> EnginePort:
    """Build the engine port from the merged CLI engine package."""
    return CheckersCliEngineAdapter.from_repo_package()

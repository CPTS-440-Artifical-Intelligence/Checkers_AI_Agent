from __future__ import annotations

import importlib
import inspect
import os
import sys
from pathlib import Path
from types import ModuleType
from typing import Any

from api.domain.models import AIMetrics, AgentConfig, GameStateData, LastMoveData, Path as MovePath
from api.engine.port import EnginePort


class EngineAdapterConfigurationError(RuntimeError):
    """Raised when an external engine module cannot satisfy the adapter contract."""


def _ensure_repo_engine_path() -> None:
    """Allow importing `engine.*` from local monorepo without extra path setup."""
    repo_root = Path(__file__).resolve().parents[4]
    local_engine_src = repo_root / "engine" / "src"
    if local_engine_src.exists():
        engine_src = str(local_engine_src)
        if engine_src not in sys.path:
            sys.path.insert(0, engine_src)


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


class EngineModuleAdapter(EnginePort):
    """Thin adapter from API service calls to an external engine module."""

    def __init__(self, module: ModuleType) -> None:
        self._module = module
        self._new_game = self._resolve_callable("new_game", "new_game_state")
        self._get_legal_moves = self._resolve_callable("get_legal_moves", "list_legal_moves")
        self._apply_move = self._resolve_callable("apply_move")
        self._choose_ai_move = self._resolve_callable("choose_ai_move")

    @classmethod
    def from_module_path(cls, module_path: str) -> EngineModuleAdapter:
        _ensure_repo_engine_path()
        module = importlib.import_module(module_path)
        return cls(module)

    def _resolve_callable(self, *names: str) -> Any:
        for name in names:
            candidate = getattr(self._module, name, None)
            if callable(candidate):
                return candidate
        joined = ", ".join(names)
        raise EngineAdapterConfigurationError(
            f"Engine module '{self._module.__name__}' is missing callable(s): {joined}"
        )

    def new_game_state(self, game_id: str) -> GameStateData:
        created = self._call_new_game(self._new_game, game_id)
        return _to_state(game_id, created)

    def list_legal_moves(self, state: GameStateData) -> list[MovePath]:
        result = self._get_legal_moves(state.as_dict())
        return _to_paths(result)

    def apply_move(self, state: GameStateData, path: MovePath) -> tuple[GameStateData, LastMoveData]:
        raw_result = self._apply_move(state.as_dict(), [list(coord) for coord in path])
        if isinstance(raw_result, tuple) and len(raw_result) == 2:
            raw_state, move_data = raw_result
        else:
            raw_state = raw_result
            move_data = {"path": [list(coord) for coord in path], "captures": [], "promoted": False}
        mapped_state = _to_state(state.game_id, raw_state)
        mapped_last_move = _to_last_move(move_data, fallback_path=path)
        mapped_state.last_move = mapped_last_move
        return mapped_state, mapped_last_move

    def choose_ai_move(self, state: GameStateData, config: AgentConfig) -> tuple[MovePath, AIMetrics]:
        raw_result = self._choose_ai_move(
            state.as_dict(),
            {
                "type": config.type,
                "max_depth": config.max_depth,
                "time_limit_ms": config.time_limit_ms,
                "seed": config.seed,
            },
        )
        if not isinstance(raw_result, tuple) or len(raw_result) != 2:
            raise ValueError("choose_ai_move must return (path, metrics).")
        raw_path, raw_metrics = raw_result
        return _to_path(raw_path), _to_metrics(raw_metrics, depth_hint=config.max_depth)

    def _call_new_game(self, func: Any, game_id: str) -> Any:
        parameters = inspect.signature(func).parameters
        if "game_id" in parameters:
            return func(game_id=game_id)
        if len(parameters) == 1:
            return func(game_id)
        return func()


def build_engine_port() -> EnginePort:
    """
    Select the active engine implementation.

    - CHECKERS_API_ENGINE_MODE=default  -> use API-owned fallback engine (default)
    - CHECKERS_API_ENGINE_MODE=external -> use engine module adapter
    - CHECKERS_API_ENGINE_MODE=auto     -> try external, then fallback to default
    """
    from api.engine.default_engine import DefaultCheckersEngine

    mode = os.getenv("CHECKERS_API_ENGINE_MODE", "default").strip().lower()
    module_path = os.getenv("CHECKERS_ENGINE_MODULE", "engine.api_contract")

    if mode == "default":
        return DefaultCheckersEngine()

    if mode == "external":
        return EngineModuleAdapter.from_module_path(module_path)

    if mode == "auto":
        try:
            return EngineModuleAdapter.from_module_path(module_path)
        except Exception:
            return DefaultCheckersEngine()

    raise EngineAdapterConfigurationError(
        "Invalid CHECKERS_API_ENGINE_MODE. Expected one of: default, external, auto."
    )

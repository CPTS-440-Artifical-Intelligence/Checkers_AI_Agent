from __future__ import annotations

import logging
import os
import uuid

from api.domain.models import AIMetrics, AgentConfig, GameStateData, Path
from api.engine.port import EnginePort
from api.errors import ApiError
from api.repositories.game_repository import GameRepository

_DEBUG_ENABLED = os.getenv("CHECKERS_DEBUG", "").strip().lower() in {"1", "true", "yes", "on"}
_LOGGER = logging.getLogger("checkers.debug")


def _normalize_path(path: list[list[int]]) -> Path:
    return [(row, col) for row, col in path]


def _debug_log(event: str, **payload: object) -> None:
    if not _DEBUG_ENABLED:
        return
    _LOGGER.info("[checkers-debug] %s %s", event, payload)


def _state_summary(state: GameStateData) -> dict[str, object]:
    return {
        "status": state.status,
        "turn": state.turn,
        "winner": state.winner,
        "last_move": None
        if state.last_move is None
        else {
            "path": [list(coord) for coord in state.last_move.path],
            "capture_count": len(state.last_move.captures),
            "promoted": state.last_move.promoted,
        },
    }


class GameService:
    """Application use-cases for game lifecycle and move execution."""

    def __init__(self, repository: GameRepository, engine: EnginePort) -> None:
        self._repository = repository
        self._engine = engine

    def create_game(self) -> GameStateData:
        game_id = uuid.uuid4().hex
        state = self._engine.new_game_state(game_id)
        self._repository.create(state)
        return state

    def get_game(self, game_id: str) -> GameStateData:
        return self._require_game(game_id)

    def reset_game(self, game_id: str) -> GameStateData:
        with self._repository.game_lock(game_id):
            self._require_game(game_id)
            state = self._engine.new_game_state(game_id)
            self._repository.save(state)
            return state

    def get_legal_moves(self, game_id: str) -> tuple[GameStateData, list[Path]]:
        state = self._require_game(game_id)
        moves = self._engine.list_legal_moves(state)
        return state, moves

    def apply_move(
        self,
        game_id: str,
        path: list[list[int]],
        trace_id: str | None = None,
    ) -> GameStateData:
        with self._repository.game_lock(game_id):
            state = self._require_game(game_id)
            normalized = _normalize_path(path)
            _debug_log(
                "service.move.pre",
                trace_id=trace_id,
                game_id=game_id,
                path=path,
                state=_state_summary(state),
            )

            try:
                next_state, last_move = self._engine.apply_move(state, normalized, trace_id=trace_id)
            except ValueError as exc:
                _debug_log(
                    "service.move.reject",
                    trace_id=trace_id,
                    game_id=game_id,
                    path=path,
                    reason=str(exc),
                    state=_state_summary(state),
                )
                raise ApiError(400, "INVALID_MOVE", "Move is not legal for the current player.") from None

            self._repository.save(next_state)
            _debug_log(
                "service.move.post",
                trace_id=trace_id,
                game_id=game_id,
                path=path,
                state=_state_summary(next_state),
                last_move={
                    "path": [list(coord) for coord in last_move.path],
                    "capture_count": len(last_move.captures),
                    "promoted": last_move.promoted,
                },
            )
            return next_state

    def apply_ai_move(
        self,
        game_id: str,
        config: AgentConfig,
        trace_id: str | None = None,
    ) -> tuple[GameStateData, Path, AIMetrics]:
        with self._repository.game_lock(game_id):
            state = self._require_game(game_id)
            _debug_log(
                "service.ai_move.pre",
                trace_id=trace_id,
                game_id=game_id,
                agent={
                    "type": config.type,
                    "max_depth": config.max_depth,
                    "time_limit_ms": config.time_limit_ms,
                    "seed": config.seed,
                },
                state=_state_summary(state),
            )

            try:
                chosen_path, metrics = self._engine.choose_ai_move(state, config, trace_id=trace_id)
            except ValueError as exc:
                _debug_log(
                    "service.ai_move.reject",
                    trace_id=trace_id,
                    game_id=game_id,
                    reason=str(exc),
                    state=_state_summary(state),
                )
                raise ApiError(400, "GAME_FINISHED", "No legal moves are available.") from None

            next_state, last_move = self._engine.apply_move(state, chosen_path, trace_id=trace_id)
            self._repository.save(next_state)
            _debug_log(
                "service.ai_move.post",
                trace_id=trace_id,
                game_id=game_id,
                chosen_path=[list(coord) for coord in chosen_path],
                metrics=metrics.as_dict(),
                state=_state_summary(next_state),
                last_move={
                    "path": [list(coord) for coord in last_move.path],
                    "capture_count": len(last_move.captures),
                    "promoted": last_move.promoted,
                },
            )
            return next_state, chosen_path, metrics

    def _require_game(self, game_id: str) -> GameStateData:
        state = self._repository.get(game_id)
        if state is None:
            raise ApiError(404, "GAME_NOT_FOUND", "Game was not found for the provided game_id.")
        return state

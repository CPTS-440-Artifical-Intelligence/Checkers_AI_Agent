from __future__ import annotations

import uuid

from api.domain.models import AIMetrics, AgentConfig, GameStateData, Path
from api.engine.port import EnginePort
from api.errors import ApiError
from api.repositories.game_repository import InMemoryGameRepository


def _normalize_path(path: list[list[int]]) -> Path:
    return [(row, col) for row, col in path]


class GameService:
    """Application use-cases for game lifecycle and move execution."""

    def __init__(self, repository: InMemoryGameRepository, engine: EnginePort) -> None:
        self._repository = repository
        self._engine = engine

    def create_game(self) -> GameStateData:
        game_id = uuid.uuid4().hex[:8]
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

    def apply_move(self, game_id: str, path: list[list[int]]) -> GameStateData:
        with self._repository.game_lock(game_id):
            state = self._require_game(game_id)
            normalized = _normalize_path(path)

            try:
                next_state, _ = self._engine.apply_move(state, normalized)
            except ValueError:
                raise ApiError(400, "INVALID_MOVE", "Move is not legal for the current player.") from None

            self._repository.save(next_state)
            return next_state

    def apply_ai_move(self, game_id: str, config: AgentConfig) -> tuple[GameStateData, Path, AIMetrics]:
        with self._repository.game_lock(game_id):
            state = self._require_game(game_id)

            try:
                chosen_path, metrics = self._engine.choose_ai_move(state, config)
            except ValueError:
                raise ApiError(400, "GAME_FINISHED", "No legal moves are available.") from None

            next_state, _ = self._engine.apply_move(state, chosen_path)
            self._repository.save(next_state)
            return next_state, chosen_path, metrics

    def _require_game(self, game_id: str) -> GameStateData:
        state = self._repository.get(game_id)
        if state is None:
            raise ApiError(404, "GAME_NOT_FOUND", "Game was not found for the provided game_id.")
        return state

from __future__ import annotations

import uuid

from api.domain.models import AIMetrics, AgentConfig, GameStateData, Path
from api.engine.port import EnginePort
from api.errors import ApiError
from api.repositories.game_repository import InMemoryGameRepository


def _as_path(path: list[list[int]]) -> Path:
    return [(row, col) for row, col in path]


def _is_capture_path(path: Path) -> bool:
    if len(path) < 2:
        return False
    return abs(path[1][0] - path[0][0]) == 2 and abs(path[1][1] - path[0][1]) == 2


class GameService:
    def __init__(self, repository: InMemoryGameRepository, engine: EnginePort) -> None:
        self._repository = repository
        self._engine = engine

    def create_game(self) -> GameStateData:
        game_id = uuid.uuid4().hex[:8]
        state = self._engine.new_game_state(game_id)
        self._repository.create(state)
        return state

    def get_game(self, game_id: str) -> GameStateData:
        state = self._repository.get(game_id)
        if state is None:
            raise ApiError(404, "GAME_NOT_FOUND", "Game was not found for the provided game_id.")
        return state

    def reset_game(self, game_id: str) -> GameStateData:
        with self._repository.game_lock(game_id):
            self.get_game(game_id)
            state = self._engine.new_game_state(game_id)
            self._repository.save(state)
            return state

    def get_legal_moves(self, game_id: str) -> tuple[GameStateData, list[Path]]:
        state = self.get_game(game_id)
        moves = self._engine.list_legal_moves(state)
        state.must_capture = any(_is_capture_path(move) for move in moves)
        self._repository.save(state)
        return state, moves

    def apply_move(self, game_id: str, path: list[list[int]]) -> GameStateData:
        with self._repository.game_lock(game_id):
            state = self.get_game(game_id)
            if state.status == "finished":
                raise ApiError(400, "GAME_FINISHED", "No moves can be applied to a finished game.")

            normalized = _as_path(path)
            legal_moves = self._engine.list_legal_moves(state)
            legal_set = {tuple(move) for move in legal_moves}
            if tuple(normalized) not in legal_set:
                raise ApiError(400, "INVALID_MOVE", "Move is not legal for the current player.")

            next_state, _ = self._engine.apply_move(state, normalized)
            self._repository.save(next_state)
            return next_state

    def apply_ai_move(self, game_id: str, config: AgentConfig) -> tuple[GameStateData, Path, AIMetrics]:
        with self._repository.game_lock(game_id):
            state = self.get_game(game_id)
            if state.status == "finished":
                raise ApiError(400, "GAME_FINISHED", "No moves can be applied to a finished game.")

            try:
                chosen_path, metrics = self._engine.choose_ai_move(state, config)
            except ValueError:
                raise ApiError(400, "GAME_FINISHED", "No legal moves are available.") from None

            next_state, _ = self._engine.apply_move(state, chosen_path)
            self._repository.save(next_state)
            return next_state, chosen_path, metrics

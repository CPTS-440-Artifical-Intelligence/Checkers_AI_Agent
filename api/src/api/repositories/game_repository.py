from __future__ import annotations

import copy
from contextlib import contextmanager
from threading import Lock
from typing import Iterator

from api.domain.models import GameStateData


def _clone_state(state: GameStateData) -> GameStateData:
    return copy.deepcopy(state)


class InMemoryGameRepository:
    """Thread-safe in-memory storage for game states."""

    def __init__(self) -> None:
        self._games: dict[str, GameStateData] = {}
        self._game_locks: dict[str, Lock] = {}
        self._store_lock = Lock()

    def create(self, state: GameStateData) -> None:
        with self._store_lock:
            self._games[state.game_id] = _clone_state(state)
            self._ensure_game_lock(state.game_id)

    def get(self, game_id: str) -> GameStateData | None:
        with self._store_lock:
            state = self._games.get(game_id)
            return _clone_state(state) if state else None

    def save(self, state: GameStateData) -> None:
        with self._store_lock:
            self._games[state.game_id] = _clone_state(state)
            self._ensure_game_lock(state.game_id)

    @contextmanager
    def game_lock(self, game_id: str) -> Iterator[None]:
        with self._store_lock:
            lock = self._ensure_game_lock(game_id)
        lock.acquire()
        try:
            yield
        finally:
            lock.release()

    def _ensure_game_lock(self, game_id: str) -> Lock:
        return self._game_locks.setdefault(game_id, Lock())

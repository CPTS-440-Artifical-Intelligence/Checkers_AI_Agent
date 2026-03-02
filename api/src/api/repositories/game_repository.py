from __future__ import annotations

import copy
from contextlib import contextmanager
from threading import Lock
from typing import Iterator

from api.domain.models import GameStateData


class InMemoryGameRepository:
    def __init__(self) -> None:
        self._games: dict[str, GameStateData] = {}
        self._game_locks: dict[str, Lock] = {}
        self._store_lock = Lock()

    def create(self, state: GameStateData) -> None:
        with self._store_lock:
            self._games[state.game_id] = copy.deepcopy(state)
            self._game_locks.setdefault(state.game_id, Lock())

    def get(self, game_id: str) -> GameStateData | None:
        with self._store_lock:
            state = self._games.get(game_id)
            return copy.deepcopy(state) if state else None

    def save(self, state: GameStateData) -> None:
        with self._store_lock:
            self._games[state.game_id] = copy.deepcopy(state)
            self._game_locks.setdefault(state.game_id, Lock())

    @contextmanager
    def game_lock(self, game_id: str) -> Iterator[None]:
        with self._store_lock:
            lock = self._game_locks.setdefault(game_id, Lock())
        lock.acquire()
        try:
            yield
        finally:
            lock.release()


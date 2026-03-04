from __future__ import annotations

import copy
import json
import os
from contextlib import contextmanager
from threading import Lock
from typing import ContextManager, Iterator, Protocol

from api.domain.models import GameStateData, LastMoveData


def _clone_state(state: GameStateData) -> GameStateData:
    return copy.deepcopy(state)


def _to_coord_pair(raw_coord: object) -> tuple[int, int]:
    if not isinstance(raw_coord, list) or len(raw_coord) != 2:
        raise ValueError("Expected coordinate to be a 2-item list.")
    return int(raw_coord[0]), int(raw_coord[1])


def _to_path(raw_path: object) -> list[tuple[int, int]]:
    if not isinstance(raw_path, list):
        raise ValueError("Expected path to be a list.")
    return [_to_coord_pair(raw_coord) for raw_coord in raw_path]


def _to_last_move(raw_last_move: object) -> LastMoveData | None:
    if raw_last_move is None:
        return None
    if not isinstance(raw_last_move, dict):
        raise ValueError("Expected last_move to be an object or null.")
    return LastMoveData(
        path=_to_path(raw_last_move.get("path", [])),
        captures=_to_path(raw_last_move.get("captures", [])),
        promoted=bool(raw_last_move.get("promoted", False)),
    )


def _state_from_dict(raw_state: dict[str, object]) -> GameStateData:
    raw_board = raw_state.get("board")
    if not isinstance(raw_board, list):
        raise ValueError("Expected board to be a list of rows.")

    return GameStateData(
        game_id=str(raw_state["game_id"]),
        board=[list(row) for row in raw_board],
        turn=str(raw_state["turn"]),
        status=str(raw_state["status"]),
        winner=raw_state.get("winner"),
        must_capture=bool(raw_state.get("must_capture", False)),
        last_move=_to_last_move(raw_state.get("last_move")),
    )


class GameRepository(Protocol):
    def create(self, state: GameStateData) -> None:
        ...

    def get(self, game_id: str) -> GameStateData | None:
        ...

    def save(self, state: GameStateData) -> None:
        ...

    def game_lock(self, game_id: str) -> ContextManager[None]:
        ...


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


class RedisGameRepository:
    """Redis-backed game storage that supports multi-instance API deployments."""

    def __init__(
        self,
        redis_url: str,
        game_prefix: str = "checkers:game",
        lock_prefix: str = "checkers:lock",
        game_ttl_s: int | None = None,
        lock_timeout_s: int = 10,
        lock_blocking_timeout_s: int = 5,
    ) -> None:
        try:
            import redis
        except ImportError as exc:
            raise RuntimeError(
                "Redis backend requested but 'redis' package is not installed. "
                "Install api dependencies again to include redis."
            ) from exc

        self._redis = redis.Redis.from_url(redis_url, decode_responses=True)
        self._game_prefix = game_prefix
        self._lock_prefix = lock_prefix
        self._game_ttl_s = game_ttl_s
        self._lock_timeout_s = lock_timeout_s
        self._lock_blocking_timeout_s = lock_blocking_timeout_s

    def create(self, state: GameStateData) -> None:
        self._redis.set(
            self._game_key(state.game_id),
            json.dumps(state.as_dict()),
            ex=self._game_ttl_s,
        )

    def get(self, game_id: str) -> GameStateData | None:
        payload = self._redis.get(self._game_key(game_id))
        if payload is None:
            return None
        loaded = json.loads(payload)
        if not isinstance(loaded, dict):
            raise ValueError("Stored game payload was not a JSON object.")
        return _state_from_dict(loaded)

    def save(self, state: GameStateData) -> None:
        self._redis.set(
            self._game_key(state.game_id),
            json.dumps(state.as_dict()),
            ex=self._game_ttl_s,
        )

    @contextmanager
    def game_lock(self, game_id: str) -> Iterator[None]:
        lock = self._redis.lock(
            self._lock_key(game_id),
            timeout=self._lock_timeout_s,
            blocking_timeout=self._lock_blocking_timeout_s,
        )
        acquired = lock.acquire(blocking=True)
        if not acquired:
            raise TimeoutError(f"Timed out waiting for game lock: {game_id}")
        try:
            yield
        finally:
            if lock.owned():
                lock.release()

    def _game_key(self, game_id: str) -> str:
        return f"{self._game_prefix}:{game_id}"

    def _lock_key(self, game_id: str) -> str:
        return f"{self._lock_prefix}:{game_id}"


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    return int(value)


def _env_optional_int(name: str) -> int | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return None
    return int(value)


def build_game_repository() -> GameRepository:
    """
    Select the active state backend.

    - CHECKERS_API_STATE_BACKEND=memory (default)
    - CHECKERS_API_STATE_BACKEND=redis + CHECKERS_REDIS_URL
    """
    backend = os.getenv("CHECKERS_API_STATE_BACKEND", "memory").strip().lower()
    if backend == "memory":
        return InMemoryGameRepository()

    if backend == "redis":
        redis_url = os.getenv("CHECKERS_REDIS_URL", "").strip()
        if not redis_url:
            raise ValueError(
                "CHECKERS_REDIS_URL is required when CHECKERS_API_STATE_BACKEND=redis."
            )
        return RedisGameRepository(
            redis_url=redis_url,
            game_prefix=os.getenv("CHECKERS_REDIS_GAME_PREFIX", "checkers:game"),
            lock_prefix=os.getenv("CHECKERS_REDIS_LOCK_PREFIX", "checkers:lock"),
            game_ttl_s=_env_optional_int("CHECKERS_REDIS_GAME_TTL_S"),
            lock_timeout_s=_env_int("CHECKERS_REDIS_LOCK_TIMEOUT_S", 10),
            lock_blocking_timeout_s=_env_int("CHECKERS_REDIS_LOCK_BLOCKING_TIMEOUT_S", 5),
        )

    raise ValueError(
        "Invalid CHECKERS_API_STATE_BACKEND. Expected one of: memory, redis."
    )

from __future__ import annotations

import os
import sys
import unittest
from importlib.util import find_spec
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.repositories.game_repository import (  # noqa: E402
    InMemoryGameRepository,
    RedisGameRepository,
    build_game_repository,
)


class StateRepositorySelectionTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_backend = os.environ.get("CHECKERS_API_STATE_BACKEND")
        self._old_redis_url = os.environ.get("CHECKERS_REDIS_URL")

    def tearDown(self) -> None:
        if self._old_backend is None:
            os.environ.pop("CHECKERS_API_STATE_BACKEND", None)
        else:
            os.environ["CHECKERS_API_STATE_BACKEND"] = self._old_backend

        if self._old_redis_url is None:
            os.environ.pop("CHECKERS_REDIS_URL", None)
        else:
            os.environ["CHECKERS_REDIS_URL"] = self._old_redis_url

    def test_memory_backend_is_default(self) -> None:
        os.environ.pop("CHECKERS_API_STATE_BACKEND", None)
        repository = build_game_repository()
        self.assertIsInstance(repository, InMemoryGameRepository)

    def test_redis_backend_requires_url(self) -> None:
        os.environ["CHECKERS_API_STATE_BACKEND"] = "redis"
        os.environ.pop("CHECKERS_REDIS_URL", None)

        with self.assertRaises(ValueError):
            build_game_repository()

    def test_redis_backend_is_constructed_when_url_present(self) -> None:
        if find_spec("redis") is None:
            self.skipTest("redis package not installed in current test environment.")

        os.environ["CHECKERS_API_STATE_BACKEND"] = "redis"
        os.environ["CHECKERS_REDIS_URL"] = "redis://localhost:6379/0"

        repository = build_game_repository()
        self.assertIsInstance(repository, RedisGameRepository)

    def test_invalid_backend_raises(self) -> None:
        os.environ["CHECKERS_API_STATE_BACKEND"] = "sqlite"

        with self.assertRaises(ValueError):
            build_game_repository()


if __name__ == "__main__":
    unittest.main(verbosity=2)

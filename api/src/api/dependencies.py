from __future__ import annotations

from api.engine.module_adapter import build_engine_port
from api.repositories.game_repository import InMemoryGameRepository
from api.services.game_service import GameService

_repository = InMemoryGameRepository()
_engine = build_engine_port()
_service = GameService(repository=_repository, engine=_engine)


def get_game_service() -> GameService:
    return _service

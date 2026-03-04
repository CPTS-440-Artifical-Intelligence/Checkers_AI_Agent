from __future__ import annotations

from api.engine.module_adapter import build_engine_port
from api.repositories.game_repository import build_game_repository
from api.services.game_service import GameService


def _build_game_service() -> GameService:
    repository = build_game_repository()
    engine = build_engine_port()
    return GameService(repository=repository, engine=engine)


_service = _build_game_service()


def get_game_service() -> GameService:
    return _service

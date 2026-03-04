from __future__ import annotations

from typing import Any, Callable

from engine import baseline
from engine.roles.board_state import provider as board_state_provider
from engine.roles.move_generation import provider as move_generation_provider
from engine.roles.search import provider as search_provider


def _with_fallback(
    preferred: Callable[..., Any],
    fallback: Callable[..., Any],
    *args: Any,
) -> Any:
    try:
        return preferred(*args)
    except NotImplementedError:
        return fallback(*args)


def new_game(game_id: str) -> dict[str, Any]:
    return _with_fallback(board_state_provider.new_game_state, baseline.new_game, game_id)


def get_legal_moves(state: dict[str, Any]) -> list[list[list[int]]]:
    return _with_fallback(move_generation_provider.list_legal_moves, baseline.get_legal_moves, state)


def apply_move(
    state: dict[str, Any],
    path: list[list[int]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    return _with_fallback(move_generation_provider.apply_move, baseline.apply_move, state, path)


def choose_ai_move(
    state: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[list[int]], dict[str, int]]:
    return _with_fallback(search_provider.choose_ai_move, baseline.choose_ai_move, state, config)

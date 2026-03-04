from __future__ import annotations

from typing import Any

from engine.roles.move_generation.templates import template_apply_move, template_legal_moves
from engine.template_mode import is_template_mode_enabled

CAPTAIN = "Matthew Covey"
ROLE = "Generating Checker Output States"


def list_legal_moves(state: dict[str, Any]) -> list[list[list[int]]]:
    """
    Return legal move paths for state["turn"] with capture-priority enforcement.

    TODO (Matthew): implement this and remove fallback usage in engine.runtime.
    """
    if not is_template_mode_enabled():
        raise NotImplementedError("move_generation.list_legal_moves is not implemented yet.")
    return template_legal_moves(state)


def apply_move(
    state: dict[str, Any],
    path: list[list[int]],
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Apply a selected move path and produce `(next_state, move_result)`.

    TODO (Matthew): replace template behavior with real successor-state logic.
    """
    if not is_template_mode_enabled():
        raise NotImplementedError("move_generation.apply_move is not implemented yet.")
    return template_apply_move(state, path)

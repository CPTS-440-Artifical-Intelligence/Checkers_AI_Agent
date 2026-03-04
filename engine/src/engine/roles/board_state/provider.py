from __future__ import annotations

from typing import Any

from engine.roles.board_state.templates import build_template_state
from engine.template_mode import is_template_mode_enabled

CAPTAIN = "Jamil Staten"
ROLE = "Data Structure Of Board"


def new_game_state(game_id: str) -> dict[str, Any]:
    """
    Build the canonical initial state dictionary.

    TODO (Jamil): implement this and remove fallback usage in engine.runtime.
    """
    if not is_template_mode_enabled():
        raise NotImplementedError("board_state.new_game_state is not implemented yet.")
    return build_template_state(game_id)

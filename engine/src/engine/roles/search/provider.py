from __future__ import annotations

import random
from typing import Any

from engine.roles.move_generation.provider import list_legal_moves
from engine.template_mode import is_template_mode_enabled

CAPTAIN = "Chandler Guthrie"
ROLE = "Minimax [Alpha/Beta] using A* Algorithm(s)"


def choose_ai_move(
    state: dict[str, Any],
    config: dict[str, Any],
) -> tuple[list[list[int]], dict[str, int]]:
    """
    Choose one legal move and return `(path, metrics)`.

    TODO (Chandler): implement this and remove fallback usage in engine.runtime.
    """
    if not is_template_mode_enabled():
        raise NotImplementedError("search.choose_ai_move is not implemented yet.")

    moves = list_legal_moves(state)
    if not moves:
        raise ValueError("No legal moves are available.")

    max_depth = int(config.get("max_depth", 1))
    time_limit_ms = int(config.get("time_limit_ms", 100))
    picker = random.Random(config.get("seed"))
    chosen = picker.choice(moves)
    metrics = {
        "depth_reached": max_depth,
        "nodes_expanded": len(moves),
        "prunes": 0,
        "time_ms": min(time_limit_ms, max(1, len(moves) // 2)),
    }
    return chosen, metrics

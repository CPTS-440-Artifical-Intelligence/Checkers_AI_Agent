from __future__ import annotations

from typing import Any, TypedDict

Coordinate = tuple[int, int]
Path = list[Coordinate]


class LastMovePayload(TypedDict):
    path: list[list[int]]
    captures: list[list[int]]
    promoted: bool


class GameStatePayload(TypedDict):
    game_id: str
    board: list[list[str]]
    turn: str
    status: str
    winner: str | None
    must_capture: bool
    last_move: LastMovePayload | None


class AgentConfigPayload(TypedDict, total=False):
    type: str
    max_depth: int
    time_limit_ms: int
    seed: int | None


class AIMetricsPayload(TypedDict):
    depth_reached: int
    nodes_expanded: int
    prunes: int
    time_ms: int


StateLike = dict[str, Any]

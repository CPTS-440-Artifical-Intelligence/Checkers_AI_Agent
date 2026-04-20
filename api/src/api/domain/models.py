from __future__ import annotations

from dataclasses import dataclass
from typing import TypeAlias

from api.shared_ai_config import SHARED_AI_ENGINE_CONFIG

Coordinate: TypeAlias = tuple[int, int]
Path: TypeAlias = list[Coordinate]


def _coords_to_lists(coords: list[Coordinate]) -> list[list[int]]:
    return [list(coord) for coord in coords]


# ---------------------------------------------------------------------------
# Configuration and telemetry
# ---------------------------------------------------------------------------
@dataclass(slots=True)
class AgentConfig:
    type: str = SHARED_AI_ENGINE_CONFIG.type
    max_depth: int = SHARED_AI_ENGINE_CONFIG.max_depth
    time_limit_ms: int = SHARED_AI_ENGINE_CONFIG.time_limit_ms
    seed: int | None = SHARED_AI_ENGINE_CONFIG.seed


@dataclass(slots=True)
class AIMetrics:
    depth_reached: int
    nodes_expanded: int
    prunes: int
    time_ms: int

    def as_dict(self) -> dict[str, int]:
        return {
            "depth_reached": self.depth_reached,
            "nodes_expanded": self.nodes_expanded,
            "prunes": self.prunes,
            "time_ms": self.time_ms,
        }


# ---------------------------------------------------------------------------
# Game state models
# ---------------------------------------------------------------------------
@dataclass(slots=True)
class LastMoveData:
    path: Path
    captures: list[Coordinate]
    promoted: bool

    def as_dict(self) -> dict[str, object]:
        return {
            "path": _coords_to_lists(self.path),
            "captures": _coords_to_lists(self.captures),
            "promoted": self.promoted,
        }


@dataclass(slots=True)
class GameStateData:
    game_id: str
    board: list[list[str]]
    turn: str
    status: str
    winner: str | None
    must_capture: bool
    last_move: LastMoveData | None

    def as_dict(self) -> dict[str, object]:
        return {
            "game_id": self.game_id,
            "board": [row[:] for row in self.board],
            "turn": self.turn,
            "status": self.status,
            "winner": self.winner,
            "must_capture": self.must_capture,
            "last_move": self.last_move.as_dict() if self.last_move else None,
        }

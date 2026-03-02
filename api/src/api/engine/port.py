from __future__ import annotations

from typing import Protocol

from api.domain.models import AIMetrics, AgentConfig, GameStateData, LastMoveData, Path


class EnginePort(Protocol):
    def new_game_state(self, game_id: str) -> GameStateData:
        ...

    def list_legal_moves(self, state: GameStateData) -> list[Path]:
        ...

    def apply_move(self, state: GameStateData, path: Path) -> tuple[GameStateData, LastMoveData]:
        ...

    def choose_ai_move(self, state: GameStateData, config: AgentConfig) -> tuple[Path, AIMetrics]:
        ...


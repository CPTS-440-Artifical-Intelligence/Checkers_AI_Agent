from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

_VALID_PIECES = {".", "r", "R", "b", "B"}


def _validate_coord(coord: list[int]) -> list[int]:
    if len(coord) != 2:
        raise ValueError("Each coordinate must have two integers.")
    row, col = coord
    if not (0 <= row < 8 and 0 <= col < 8):
        raise ValueError("Coordinates must be in the range [0, 7].")
    return coord


class MoveRequest(BaseModel):
    path: list[list[int]] = Field(min_length=2)

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: list[list[int]]) -> list[list[int]]:
        return [_validate_coord(coord) for coord in value]


class AgentConfigRequest(BaseModel):
    type: str = "alphabeta"
    max_depth: int = Field(default=6, ge=1, le=32)
    time_limit_ms: int = Field(default=800, ge=10, le=60_000)
    seed: int | None = None


class AIMoveRequest(BaseModel):
    agent: AgentConfigRequest = Field(default_factory=AgentConfigRequest)


class LastMoveResponse(BaseModel):
    path: list[list[int]]
    captures: list[list[int]]
    promoted: bool


class GameStateResponse(BaseModel):
    game_id: str
    board: list[list[str]]
    turn: Literal["red", "black"]
    status: Literal["in_progress", "finished"]
    winner: Literal["red", "black"] | None
    must_capture: bool
    last_move: LastMoveResponse | None

    @field_validator("board")
    @classmethod
    def validate_board(cls, board: list[list[str]]) -> list[list[str]]:
        if len(board) != 8:
            raise ValueError("Board must have 8 rows.")
        for row in board:
            if len(row) != 8:
                raise ValueError("Each board row must have 8 columns.")
            for piece in row:
                if piece not in _VALID_PIECES:
                    raise ValueError("Board contains an invalid piece code.")
        return board


class LegalMoveResponse(BaseModel):
    path: list[list[int]]


class LegalMovesResponse(BaseModel):
    game_id: str
    turn: Literal["red", "black"]
    must_capture: bool
    moves: list[LegalMoveResponse]


class AIMetricsResponse(BaseModel):
    depth_reached: int
    nodes_expanded: int
    prunes: int
    time_ms: int


class AIMoveDetailsResponse(BaseModel):
    chosen_move: LegalMoveResponse
    metrics: AIMetricsResponse


class AIMoveEnvelopeResponse(BaseModel):
    state: GameStateResponse
    ai: AIMoveDetailsResponse


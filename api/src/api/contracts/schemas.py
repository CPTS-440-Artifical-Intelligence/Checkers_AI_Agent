from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

from api.shared_ai_config import SHARED_AI_ENGINE_CONFIG

_BOARD_SIZE = 6
_VALID_PIECES = {".", "r", "R", "b", "B"}


def _validate_coord(coord: list[int]) -> list[int]:
    if len(coord) != 2:
        raise ValueError("Each coordinate must have two integers.")
    row, col = coord
    if not (0 <= row < _BOARD_SIZE and 0 <= col < _BOARD_SIZE):
        raise ValueError("Coordinates must be in the range [0, 5].")
    return coord


def _validate_board_shape(board: list[list[str]]) -> None:
    if len(board) != _BOARD_SIZE:
        raise ValueError("Board must have 6 rows.")
    for row in board:
        if len(row) != _BOARD_SIZE:
            raise ValueError("Each board row must have 6 columns.")


def _validate_piece_codes(board: list[list[str]]) -> None:
    for row in board:
        for piece in row:
            if piece not in _VALID_PIECES:
                raise ValueError("Board contains an invalid piece code.")


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class MoveRequest(BaseModel):
    path: list[list[int]] = Field(min_length=2)

    @field_validator("path")
    @classmethod
    def validate_path(cls, value: list[list[int]]) -> list[list[int]]:
        return [_validate_coord(coord) for coord in value]


class AgentConfigRequest(BaseModel):
    type: str = SHARED_AI_ENGINE_CONFIG.type
    max_depth: int = Field(default=SHARED_AI_ENGINE_CONFIG.max_depth, ge=1, le=32)
    time_limit_ms: int = Field(default=SHARED_AI_ENGINE_CONFIG.time_limit_ms, ge=10, le=60_000)
    seed: int | None = SHARED_AI_ENGINE_CONFIG.seed


class AIMoveRequest(BaseModel):
    agent: AgentConfigRequest = Field(default_factory=AgentConfigRequest)


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------
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
        _validate_board_shape(board)
        _validate_piece_codes(board)
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
    score: float


class AIMoveDetailsResponse(BaseModel):
    chosen_move: LegalMoveResponse
    metrics: AIMetricsResponse


class AIMoveEnvelopeResponse(BaseModel):
    state: GameStateResponse
    ai: AIMoveDetailsResponse

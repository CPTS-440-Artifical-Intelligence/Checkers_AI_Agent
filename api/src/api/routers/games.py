from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from api.contracts.schemas import (
    AIMoveEnvelopeResponse,
    AIMoveRequest,
    AIMoveDetailsResponse,
    AIMetricsResponse,
    AgentConfigRequest,
    GameStateResponse,
    LegalMoveResponse,
    LegalMovesResponse,
    MoveRequest,
)
from api.dependencies import get_game_service
from api.domain.models import AgentConfig, Path
from api.services.game_service import GameService

router = APIRouter()
_TRACE_HEADER = "x-checkers-trace-id"


def _path_to_response(path: Path) -> list[list[int]]:
    return [list(coord) for coord in path]


def _state_to_response(state: dict[str, object]) -> GameStateResponse:
    return GameStateResponse.model_validate(state)


def _agent_config_from_payload(payload: AIMoveRequest | None) -> AgentConfig:
    agent = payload.agent if payload is not None else AgentConfigRequest()
    return AgentConfig(
        type=agent.type,
        max_depth=agent.max_depth,
        time_limit_ms=agent.time_limit_ms,
        seed=agent.seed,
    )


def _legal_moves_to_response(
    game_id: str,
    turn: str,
    must_capture: bool,
    moves: list[Path],
) -> LegalMovesResponse:
    return LegalMovesResponse(
        game_id=game_id,
        turn=turn,  # type: ignore[arg-type]
        must_capture=must_capture,
        moves=[LegalMoveResponse(path=_path_to_response(path)) for path in moves],
    )


def _ai_move_to_response(
    state: dict[str, object],
    chosen_path: Path,
    metrics: dict[str, int],
) -> AIMoveEnvelopeResponse:
    return AIMoveEnvelopeResponse(
        state=_state_to_response(state),
        ai=AIMoveDetailsResponse(
            chosen_move=LegalMoveResponse(path=_path_to_response(chosen_path)),
            metrics=AIMetricsResponse.model_validate(metrics),
        ),
    )


@router.post("/games", response_model=GameStateResponse)
def create_game(service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.create_game()
    return _state_to_response(state.as_dict())


@router.get("/games/{game_id}", response_model=GameStateResponse)
def get_game(game_id: str, service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.get_game(game_id)
    return _state_to_response(state.as_dict())


@router.post("/games/{game_id}/reset", response_model=GameStateResponse)
def reset_game(game_id: str, service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.reset_game(game_id)
    return _state_to_response(state.as_dict())


@router.get("/games/{game_id}/legal-moves", response_model=LegalMovesResponse)
def get_legal_moves(game_id: str, service: GameService = Depends(get_game_service)) -> LegalMovesResponse:
    state, moves = service.get_legal_moves(game_id)
    return _legal_moves_to_response(
        game_id=state.game_id,
        turn=state.turn,
        must_capture=state.must_capture,
        moves=moves,
    )


@router.post("/games/{game_id}/move", response_model=GameStateResponse)
def apply_move(
    game_id: str,
    payload: MoveRequest,
    request: Request,
    service: GameService = Depends(get_game_service),
) -> GameStateResponse:
    trace_id = request.headers.get(_TRACE_HEADER)
    state = service.apply_move(game_id, payload.path, trace_id=trace_id)
    return _state_to_response(state.as_dict())


@router.post("/games/{game_id}/ai-move", response_model=AIMoveEnvelopeResponse)
def apply_ai_move(
    game_id: str,
    request: Request,
    payload: AIMoveRequest | None = None,
    service: GameService = Depends(get_game_service),
) -> AIMoveEnvelopeResponse:
    trace_id = request.headers.get(_TRACE_HEADER)
    config = _agent_config_from_payload(payload)
    state, chosen_path, metrics = service.apply_ai_move(game_id, config, trace_id=trace_id)
    return _ai_move_to_response(
        state=state.as_dict(),
        chosen_path=chosen_path,
        metrics=metrics.as_dict(),
    )

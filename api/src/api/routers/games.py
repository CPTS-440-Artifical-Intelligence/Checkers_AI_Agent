from __future__ import annotations

from fastapi import APIRouter, Depends

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


def _serialize_path(path: Path) -> list[list[int]]:
    return [list(coord) for coord in path]


def _serialize_state(state: dict[str, object]) -> GameStateResponse:
    return GameStateResponse.model_validate(state)


@router.post("/games", response_model=GameStateResponse)
def create_game(service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.create_game()
    return _serialize_state(state.as_dict())


@router.get("/games/{game_id}", response_model=GameStateResponse)
def get_game(game_id: str, service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.get_game(game_id)
    return _serialize_state(state.as_dict())


@router.post("/games/{game_id}/reset", response_model=GameStateResponse)
def reset_game(game_id: str, service: GameService = Depends(get_game_service)) -> GameStateResponse:
    state = service.reset_game(game_id)
    return _serialize_state(state.as_dict())


@router.get("/games/{game_id}/legal-moves", response_model=LegalMovesResponse)
def get_legal_moves(game_id: str, service: GameService = Depends(get_game_service)) -> LegalMovesResponse:
    state, moves = service.get_legal_moves(game_id)
    return LegalMovesResponse(
        game_id=state.game_id,
        turn=state.turn,  # type: ignore[arg-type]
        must_capture=state.must_capture,
        moves=[LegalMoveResponse(path=_serialize_path(path)) for path in moves],
    )


@router.post("/games/{game_id}/move", response_model=GameStateResponse)
def apply_move(
    game_id: str,
    payload: MoveRequest,
    service: GameService = Depends(get_game_service),
) -> GameStateResponse:
    state = service.apply_move(game_id, payload.path)
    return _serialize_state(state.as_dict())


@router.post("/games/{game_id}/ai-move", response_model=AIMoveEnvelopeResponse)
def apply_ai_move(
    game_id: str,
    payload: AIMoveRequest | None = None,
    service: GameService = Depends(get_game_service),
) -> AIMoveEnvelopeResponse:
    agent = payload.agent if payload is not None else AgentConfigRequest()
    config = AgentConfig(
        type=agent.type,
        max_depth=agent.max_depth,
        time_limit_ms=agent.time_limit_ms,
        seed=agent.seed,
    )
    state, chosen_path, metrics = service.apply_ai_move(game_id, config)
    return AIMoveEnvelopeResponse(
        state=_serialize_state(state.as_dict()),
        ai=AIMoveDetailsResponse(
            chosen_move=LegalMoveResponse(path=_serialize_path(chosen_path)),
            metrics=AIMetricsResponse.model_validate(metrics.as_dict()),
        ),
    )

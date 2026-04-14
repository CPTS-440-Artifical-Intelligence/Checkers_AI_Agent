# FastAPI Endpoints Used By Engine Integration

Base prefix: `/api`

## Endpoints

1. `GET /api/health`
Purpose: liveness check.
Response: `{ "ok": true }`

2. `POST /api/games`
Purpose: create a new game state.
Response: `GameStateResponse`

3. `GET /api/games/{game_id}`
Purpose: fetch the current game state.
Response: `GameStateResponse`

4. `POST /api/games/{game_id}/reset`
Purpose: reset an existing game.
Response: `GameStateResponse`

5. `GET /api/games/{game_id}/legal-moves`
Purpose: fetch legal moves for the current turn.
Response: `LegalMovesResponse`

6. `POST /api/games/{game_id}/move`
Purpose: apply a human move path.
Request:
```json
{ "path": [[5, 0], [4, 1]] }
```
Response: `GameStateResponse`

7. `POST /api/games/{game_id}/ai-move`
Purpose: ask the engine for an AI move and apply it.
Request:
```json
{
  "agent": {
    "type": "alphabeta",
    "max_depth": 6,
    "time_limit_ms": 800,
    "seed": 123
  }
}
```
Response: `AIMoveEnvelopeResponse`

## Error Shapes

- `400`: `INVALID_MOVE`, `GAME_FINISHED`, `BAD_REQUEST`
- `404`: `GAME_NOT_FOUND`
- `422`: FastAPI validation errors

Standard API error body:
```json
{
  "error": "INVALID_MOVE",
  "message": "Move is not legal for the current player."
}
```

## Board Contract

- Board size is `6x6`
- Coordinates are `[row, col]`
- Piece codes are `.`, `r`, `R`, `b`, `B`
- Game state responses are the API source of truth for the frontend

For the fuller API contract, examples, and deployment notes, see `api/README.md`.

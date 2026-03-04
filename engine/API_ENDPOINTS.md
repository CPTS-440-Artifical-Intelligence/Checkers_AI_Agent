# FastAPI Endpoints Used By Engine Integration

Base prefix: `/api`

## Endpoints

1. `GET /api/health`
Purpose: liveness check.
Response: `{ "ok": true }`

2. `POST /api/games`
Purpose: create new game state.
Response: `GameStateResponse`

3. `GET /api/games/{game_id}`
Purpose: fetch current game state.
Response: `GameStateResponse`

4. `POST /api/games/{game_id}/reset`
Purpose: reset an existing game.
Response: `GameStateResponse`

5. `GET /api/games/{game_id}/legal-moves`
Purpose: fetch legal moves for current turn.
Response: `LegalMovesResponse`

6. `POST /api/games/{game_id}/move`
Purpose: apply a human move path.
Request:
```json
{ "path": [[5, 0], [4, 1]] }
```
Response: `GameStateResponse`

7. `POST /api/games/{game_id}/ai-move`
Purpose: ask engine for AI move and apply it.
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

## Template Mode For Wiring Tests

Enable:

```bash
set CHECKERS_API_ENGINE_MODE=external
set CHECKERS_ENGINE_MODULE=engine.api_contract
set CHECKERS_ENGINE_TEMPLATE_MODE=1
```

Behavior in this mode:
- `POST /api/games` returns an imported template start state.
- `POST /api/games/{game_id}/move` accepts template legal moves that relocate an active-side piece to any square.

# API

## API Contract

This repo is split into:
- `checkers_cli/` Live gameplay engine and AI logic used by the API
- `api/` FastAPI server that exposes the engine over HTTP
- `web/` React UI that talks to the API via `/api/*` routes

The API is the single source of truth for game state. The frontend never computes rules or validates moves beyond basic UI checks.

### Base URL

All routes are prefixed with:

- `/api`

In development, the React app should call relative paths like `fetch("/api/health")` and rely on a dev proxy.
In production, `/api/*` should be proxied to the FastAPI host (so the frontend can still call `/api/...`).

If you skip proxying and call the Render API URL directly from the browser, set `CHECKERS_CORS_ORIGINS` on the API.

### Board Coordinates

All board coordinates are:
- 0-based indexing
- `[row, col]`
- `row = 0` is the top of the board in the UI
- `col = 0` is the left of the board in the UI

### Piece Encoding

The board is always a 6x6 array of single-character strings:

- `.` empty
- `r` red man
- `R` red king
- `b` black man
- `B` black king

### Move Encoding

Moves are represented as a path of landing squares:

- Normal move: `[[r0, c0], [r1, c1]]`
- Multi-capture: `[[r0, c0], [r1, c1], [r2, c2], ...]`

The API validates all moves. The UI should treat `legal_moves` as authoritative.

### Game State Shape

All endpoints that return game state should use this shape:

```json
{
  "game_id": "string",
  "board": [[".", "b", ".", ...], ...],
  "turn": "red",
  "status": "in_progress",
  "winner": null,
  "must_capture": false,
  "last_move": {
    "path": [[5,0],[4,1]],
    "captures": [[4,1]],
    "promoted": false
  }
}
```

Notes:
- `turn` is always `"red"` or `"black"`.
- `status` is `"in_progress"` or `"finished"`.
- `winner` is `null`, `"red"`, or `"black"`.
- `last_move` may be `null` if no move has been played yet.
- `captures` contains captured piece coordinates if applicable, otherwise an empty array.

### Endpoints

#### Health Check

`GET /api/health`

Used for:
- verifying the API is running locally
- deployment health checks
- verifying frontend proxy wiring

Response:

```json
{ "ok": true }
```

#### Create Game

`POST /api/games`

Response: full game state (new game)

```json
{
  "game_id": "3f2c9f2b",
  "board": [...],
  "turn": "red",
  "status": "in_progress",
  "winner": null,
  "must_capture": false,
  "last_move": null
}
```

#### Get Game State

`GET /api/games/{game_id}`

Response: full game state.

#### Reset Game

`POST /api/games/{game_id}/reset`

Response: full game state (reset).

#### Get Legal Moves

`GET /api/games/{game_id}/legal-moves`

Response:

```json
{
  "game_id": "3f2c9f2b",
  "turn": "red",
  "must_capture": false,
  "moves": [
    { "path": [[5,0],[4,1]] },
    { "path": [[5,2],[4,3]] }
  ]
}
```

#### Apply Human Move

`POST /api/games/{game_id}/move`

Request:

```json
{
  "path": [[5,0],[4,1]]
}
```

Response: full game state (after move).

#### Apply AI Move

`POST /api/games/{game_id}/ai-move`

Request:

```json
{
  "agent": {
    "type": "alphabeta",
    "max_depth": 15,
    "time_limit_ms": 800,
    "seed": 123
  }
}
```

Response:

```json
{
  "state": { "...full game state..." },
  "ai": {
    "chosen_move": { "path": [[2,1],[3,2]] },
    "metrics": {
      "depth_reached": 15,
      "nodes_expanded": 18432,
      "prunes": 5100,
      "time_ms": 742
    }
  }
}
```

Notes:
- If an `agent` field is omitted, the API uses the shared engine defaults from `shared/checkers_ai_config.json`.
- `metrics` fields may evolve, but should keep these keys if possible.

### Error Handling

Errors must be JSON and consistent:
- `400` invalid move / malformed payload
- `404` unknown `game_id`
- `422` validation errors (FastAPI/Pydantic)

Standard error response shape:

```json
{
  "error": "INVALID_MOVE",
  "message": "Move is not legal for the current player."
}
```

Recommended error codes:
- `INVALID_MOVE`
- `GAME_NOT_FOUND`
- `GAME_FINISHED`
- `BAD_REQUEST`

### Concurrency Rule

The API must prevent double-moves caused by fast repeated clicks.

Operations that mutate a game (`/move`, `/ai-move`, `/reset`) should be protected by a per-game lock.

### State Backend (Single Instance vs Multi-Instance)

Game state storage is configurable:

- `CHECKERS_API_STATE_BACKEND=memory` (default)
- `CHECKERS_API_STATE_BACKEND=redis` (recommended for multi-instance deployment)

Redis mode requires:

- `CHECKERS_REDIS_URL` (example: `redis://localhost:6379/0`)

Optional Redis tuning:

- `CHECKERS_REDIS_GAME_PREFIX` (default: `checkers:game`)
- `CHECKERS_REDIS_LOCK_PREFIX` (default: `checkers:lock`)
- `CHECKERS_REDIS_GAME_TTL_S` (default: unset/no expiry)
- `CHECKERS_REDIS_LOCK_TIMEOUT_S` (default: `10`)
- `CHECKERS_REDIS_LOCK_BLOCKING_TIMEOUT_S` (default: `5`)

Use `memory` for local dev and simple single-instance runs.
Use `redis` on Render if you want multiple API instances to share games safely.

### CORS Configuration (Optional)

CORS is disabled by default.

Enable it only when the browser calls the API by full Render origin URL:

- `CHECKERS_CORS_ORIGINS=https://your-site.netlify.app,http://localhost:5173`

If Netlify proxies `/api/*` to Render, CORS is not required for normal frontend requests.

### Engine Requirements (What the API Expects)

The API uses the merged CLI engine in `checkers_cli/checkers_engine` through the adapter at `api/src/api/engine/module_adapter.py`.
Shared AI defaults for the CLI, API, and web client live in `shared/checkers_ai_config.json`.

Deployment note:
- Keep the monorepo layout intact so `checkers_cli/` is available next to `api/`.
- If the real engine import fails, deployment should fail fast.

## Implementation Architecture

The API implementation follows a layered structure inside `api/src/api`:

- `contracts/`: Pydantic request/response schemas (HTTP boundary only).
- `routers/`: FastAPI route handlers that map HTTP calls to service use-cases.
- `services/`: application orchestration and business rules for API workflows.
- `repositories/`: persistence boundary (in-memory or Redis-backed with per-game locks).
- `api/src/api/engine/`: adapter boundary used by the API layer to talk to `checkers_cli/checkers_engine`.
- `domain/`: internal dataclasses shared between service/repository/engine layers.

This keeps the transport layer, orchestration, state storage, and game logic encapsulated and swappable.
The API does not contain gameplay rules; game behavior comes from `checkers_cli/checkers_engine`.

## Local TDD Workflow (No Render Calls)

Run all API contract tests locally:

```bash
cd api
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

These tests run directly against the FastAPI ASGI app in-process and verify endpoint behavior/JSON contracts without deploying or hitting Render rate limits.

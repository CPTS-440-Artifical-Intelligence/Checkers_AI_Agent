# Checkers_AI_Agent
CPTS_440 Artifical Intelligence Group Project


## API Contract

This repo is split into:
- `engine/` Pure Python game logic (board state, legal moves, apply move, AI agents)
- `api/` FastAPI server that exposes the engine over HTTP
- `web/` React UI that talks to the API via `/api/*` routes

The API is the single source of truth for game state. The frontend never computes rules or validates moves beyond basic UI checks.

### Base URL

All routes are prefixed with:

- `/api`

In development, the React app should call relative paths like `fetch("/api/health")` and rely on a dev proxy.
In production, `/api/*` should be proxied to the FastAPI host (so the frontend can still call `/api/...`).

### Board Coordinates

All board coordinates are:
- 0-based indexing
- `[row, col]`
- `row = 0` is the top of the board in the UI
- `col = 0` is the left of the board in the UI

### Piece Encoding

The board is always an 8x8 array of single-character strings:

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
    "max_depth": 6,
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
      "depth_reached": 6,
      "nodes_expanded": 18432,
      "prunes": 5100,
      "time_ms": 742
    }
  }
}
```

Notes:
- If an `agent` field is omitted, the API should use reasonable defaults.
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

### Engine Requirements (What the API Expects)

The engine is expected to implement these core functions (names may vary, behavior must match):

```python
new_game() -> state
get_legal_moves(state) -> list[path]
apply_move(state, path) -> (new_state, move_result)
is_terminal(state) -> (status, winner_or_none)
choose_ai_move(state, config) -> (path, metrics)
```


## Contributing

### Begin New Feature

1. Refresh the local `dev` branch to be upstream:
 ```
 git fetch origin
 git checkout dev
 git pull origin dev
 ```
2. Create a new feature branch locally, then push to the repo:
 ```
 git checkout -b feature/my-feature
 git push -u origin feature/my-feature
 ```

### Rebasing
If you've worked on your feature branch and the collaborative branch (`dev`) has been updated/pushed to, then we have to be mindful of merge conflicts.
We do this by rebasing your work from the previous commit of `dev` to the latest commit.
This means it will order the `dev` new commits first before placing yours on top.
[More Info on Rebasing](https://www.atlassian.com/git/tutorials/merging-vs-rebasing)

1. From your branch, fetch all the repo's latest changes and rebase off of `origin/dev`:
 ```
 git checkout feature/my-feature
 git fetch origin
 git rebase origin/dev
 ```
2. If the same file is modified in both `dev` and your branch, you will likely need to resolve merge conflicts manually in your editor. Once you solve the conflicting files:
 ```
 git add .
 git rebase --continue
 ```
3. Repeat until rebase completes successfully.
4. If you ever need to abort:
 ```
 git rebase --abort
 ```
5. Once resolved, push:
 ```
 git push -f origin feature/my-feature
 ```

### Finish New Feature

1. Push all your work to your local branch.
 ```
 git add .
 git commit -m "your commit message"
 git push
 ```
2. Create a Pull Request through GitHub
   - Select the `Pull Request` tab in the repo.
   - Select `New pull request`.
   - Select `dev` for base, and your `feature/my-feature` for compare.
3. Wait for the team to review before merging.
4. Once merged, delete your `feature/my-feature` branch.

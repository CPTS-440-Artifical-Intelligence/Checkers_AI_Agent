# Engine

This folder is owned by the engine team and should contain pure game logic:

- board representation and state transitions
- legal move generation
- move application (including captures and promotions)
- AI move selection (minimax/alpha-beta/A* experiments)

The API layer already has a thin adapter that expects this module:

- `engine/src/engine/api_contract.py`

## Required Functions

Implement these functions in `engine/src/engine/api_contract.py`:

```python
def new_game(game_id: str) -> dict: ...
def get_legal_moves(state: dict) -> list[list[list[int]]]: ...
def apply_move(state: dict, path: list[list[int]]) -> tuple[dict, dict]: ...
def choose_ai_move(state: dict, config: dict) -> tuple[list[list[int]], dict]: ...
```

## Data Contract

### State shape

```json
{
  "game_id": "abc12345",
  "board": [[".", "b", ".", "..."], ["..."], ["..."]],
  "turn": "red",
  "status": "in_progress",
  "winner": null,
  "must_capture": false,
  "last_move": null
}
```

Rules:
- `board` must be 8x8
- piece codes: `.`, `r`, `R`, `b`, `B`
- `turn` is `"red"` or `"black"`
- `status` is `"in_progress"` or `"finished"`
- `winner` is `null`, `"red"`, or `"black"`

### Move path shape

- simple move: `[[r0, c0], [r1, c1]]`
- multi-capture: `[[r0, c0], [r1, c1], [r2, c2], ...]`

### `apply_move` return

`apply_move` returns `(next_state, move_result)`.

`move_result` shape:

```json
{
  "path": [[5, 0], [4, 1]],
  "captures": [],
  "promoted": false
}
```

### `choose_ai_move` return

`choose_ai_move` returns `(path, metrics)`.

`metrics` keys:
- `depth_reached`
- `nodes_expanded`
- `prunes`
- `time_ms`

## Behavioral Expectations

1. `get_legal_moves` returns only legal moves for `state["turn"]`.
2. If any capture is available, non-capture moves should not be returned.
3. `apply_move` should reject illegal paths.
4. `apply_move` should update turn, game status, winner, and `last_move`.
5. `choose_ai_move` should return one move from `get_legal_moves`.

## Local Dev Loop

Run API contract tests locally (no Render calls):

```bash
cd api
.venv\Scripts\python.exe -m unittest discover -s tests -v
```

If your engine implementation is ready and you want API to use it:

```bash
set CHECKERS_API_ENGINE_MODE=external
set CHECKERS_ENGINE_MODULE=engine.api_contract
```

Then start API normally:

```bash
cd api
start-local-api.bat
```

## Suggested Scope Split

1. Core state and data structures.
2. Legal move generator.
3. Move application and terminal-state detection.
4. AI policy (`choose_ai_move`) with metrics.
5. Team-level unit tests inside `engine/` for faster iteration.


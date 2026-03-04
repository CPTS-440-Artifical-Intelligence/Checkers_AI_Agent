# Engine

This folder is owned by the engine team and should contain pure game logic:

- board representation and state transitions
- legal move generation
- move application (including captures and promotions)
- AI move selection (minimax/alpha-beta/A* experiments)

The API layer already has a thin adapter that imports this module:

- `engine/src/engine/api_contract.py`

## Current Setup

`api_contract.py` is now wired and API-ready. It delegates into:

- `engine/src/engine/runtime.py`: stable runtime entrypoints used by API
- `engine/src/engine/baseline.py`: working fallback implementation
- `engine/src/engine/roles/*`: teammate role stubs that can replace fallback logic incrementally

This means the API can run immediately in `external` mode while each role is implemented.

## Role Directories

Role ownership is documented in:

- `engine/TEAM_ROLES.md`

Implemented stubs:

- `engine/src/engine/roles/board_state/provider.py`
- `engine/src/engine/roles/move_generation/provider.py`
- `engine/src/engine/roles/search/provider.py`

### Template Wiring Mode

For frontend/backend smoke tests, you can enable imported templates:

```bash
set CHECKERS_API_ENGINE_MODE=external
set CHECKERS_ENGINE_MODULE=engine.api_contract
set CHECKERS_ENGINE_TEMPLATE_MODE=1
```

When enabled:
- `new_game` starts from `engine/src/engine/roles/board_state/templates.py`
- `get_legal_moves` returns "move any active-side piece to any square" paths
- `apply_move` relocates the selected piece and returns a standard move_result payload

This mode exists to validate full wiring quickly and is intended to be replaced role-by-role.

## API Contract

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


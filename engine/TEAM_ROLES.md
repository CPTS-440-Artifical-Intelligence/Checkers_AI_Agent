# Engine Team Roles

This layout separates responsibilities by domain boundary, not by personal branch structure.
Each captain owns one provider module and can swap in their implementation without changing API wiring.

## Role Map

1. `Data Structure Of Board` (Captain: Jamil Staten)
Path: `engine/src/engine/roles/board_state/provider.py`
Scope:
- canonical state shape and initialization
- board representation helpers

2. `Generating Checker Output States` (Captain: Matthew Covey)
Path: `engine/src/engine/roles/move_generation/provider.py`
Scope:
- legal move generation for active side
- capture-priority enforcement
- successor state updates for selected paths (`apply_move`)

3. `Minimax [Alpha/Beta] using A* Algorithm(s)` (Captain: Chandler Guthrie)
Path: `engine/src/engine/roles/search/provider.py`
Scope:
- AI move choice policy
- metrics reporting (`depth_reached`, `nodes_expanded`, `prunes`, `time_ms`)

4. `Attaching Everything Together` (Captain: Jack Underhill)
Scope:
- frontend/backend wiring and end-to-end integration workflow
- API route orchestration at application layer

## Workflow

1. Keep `engine/src/engine/api_contract.py` function signatures stable.
2. Implement one role provider at a time.
3. Remove `NotImplementedError` in the provider when ready.
4. Runtime falls back to `engine/src/engine/baseline.py` until each provider is complete.

## Template Wiring Mode

Set `CHECKERS_ENGINE_TEMPLATE_MODE=1` to enable imported template behavior in role providers.
This mode is for full-stack wiring tests and is meant to be replaced by real logic per role.

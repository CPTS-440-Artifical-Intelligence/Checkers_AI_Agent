# Engine Team Roles

This layout separates responsibilities by domain boundary, not by personal branch structure.
Each captain owns a gameplay area even though the app now runs through the real `checkers_cli/checkers_engine` path only.

## Role Map

1. `Data Structure Of Board` (Captain: Jamil Staten)
Scope:
- canonical state shape and initialization
- board representation helpers

2. `Generating Checker Output States` (Captain: Matthew Covey)
Scope:
- legal move generation for the active side
- capture-priority enforcement
- successor state updates for selected move paths

3. `Minimax [Alpha/Beta] using A* Algorithm(s)` (Captain: Chandler Guthrie)
Scope:
- AI move choice policy
- metrics reporting (`depth_reached`, `nodes_expanded`, `prunes`, `time_ms`)

4. `Attaching Everything Together` (Captain: Jack Underhill)
Scope:
- frontend/backend wiring and end-to-end integration workflow
- API route orchestration at the application layer

## Working Agreement

1. Keep the public gameplay contract stable at the API boundary.
2. Coordinate engine changes against the real `checkers_cli/checkers_engine` implementation.
3. Treat the API responses as the source of truth for full-stack behavior.

from __future__ import annotations

import sys
import unittest
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from api.dependencies import get_game_service  # noqa: E402
from api.engine.module_adapter import build_engine_port  # noqa: E402
from api.main import create_app  # noqa: E402
from api.repositories.game_repository import InMemoryGameRepository  # noqa: E402
from api.services.game_service import GameService  # noqa: E402
from asgi_client import request  # noqa: E402


class APIContractTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app()
        service = GameService(
            repository=InMemoryGameRepository(),
            engine=build_engine_port(),
        )
        self.app.dependency_overrides[get_game_service] = lambda: service

    def tearDown(self) -> None:
        self.app.dependency_overrides.clear()

    def _request(self, method: str, path: str, payload: Any | None = None) -> tuple[int, Any]:
        return request(self.app, method, path, payload)

    def _create_game(self) -> dict[str, Any]:
        status, data = self._request("POST", "/api/games")
        self.assertEqual(status, 200)
        self.assertIsInstance(data, dict)
        return data

    def test_health(self) -> None:
        status, data = self._request("GET", "/api/health")
        self.assertEqual(status, 200)
        self.assertEqual(data, {"ok": True})

    def test_create_game_returns_contract_shape(self) -> None:
        data = self._create_game()
        self.assertIn("game_id", data)
        self.assertEqual(data["turn"], "red")
        self.assertEqual(data["status"], "in_progress")
        self.assertIsNone(data["winner"])
        self.assertFalse(data["must_capture"])
        self.assertIsNone(data["last_move"])
        self.assertEqual(len(data["board"]), 6)
        self.assertTrue(all(len(row) == 6 for row in data["board"]))

    def test_get_unknown_game_returns_404_error_shape(self) -> None:
        status, data = self._request("GET", "/api/games/unknown")
        self.assertEqual(status, 404)
        self.assertEqual(data["error"], "GAME_NOT_FOUND")
        self.assertIn("message", data)

    def test_get_legal_moves_for_new_game(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, data = self._request("GET", f"/api/games/{game_id}/legal-moves")
        self.assertEqual(status, 200)
        self.assertEqual(data["game_id"], game_id)
        self.assertEqual(data["turn"], "red")
        self.assertIsInstance(data["moves"], list)
        self.assertGreater(len(data["moves"]), 0)
        for move in data["moves"]:
            self.assertIn("path", move)
            self.assertEqual(len(move["path"]), 2)

    def test_invalid_move_returns_400(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, data = self._request(
            "POST",
            f"/api/games/{game_id}/move",
            payload={"path": [[0, 0], [1, 1]]},
        )
        self.assertEqual(status, 400)
        self.assertEqual(data["error"], "INVALID_MOVE")

    def test_valid_move_updates_turn_and_last_move(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, legal = self._request("GET", f"/api/games/{game_id}/legal-moves")
        self.assertEqual(status, 200)
        chosen = legal["moves"][0]["path"]

        status, moved = self._request("POST", f"/api/games/{game_id}/move", payload={"path": chosen})
        self.assertEqual(status, 200)
        self.assertEqual(moved["turn"], "black")
        self.assertIsInstance(moved["last_move"], dict)
        self.assertEqual(moved["last_move"]["path"], chosen)

    def test_ai_move_returns_state_and_metrics(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, data = self._request(
            "POST",
            f"/api/games/{game_id}/ai-move",
            payload={"agent": {"type": "alphabeta", "max_depth": 4, "time_limit_ms": 200, "seed": 7}},
        )
        self.assertEqual(status, 200)
        self.assertIn("state", data)
        self.assertIn("ai", data)
        self.assertIn("chosen_move", data["ai"])
        self.assertIn("metrics", data["ai"])
        for key in ("depth_reached", "nodes_expanded", "prunes", "time_ms"):
            self.assertIn(key, data["ai"]["metrics"])

    def test_ai_move_works_with_default_payload(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, data = self._request("POST", f"/api/games/{game_id}/ai-move")
        self.assertEqual(status, 200)
        self.assertIn("state", data)
        self.assertIn("ai", data)

    def test_reset_game_restores_initial_state(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, legal = self._request("GET", f"/api/games/{game_id}/legal-moves")
        self.assertEqual(status, 200)
        chosen = legal["moves"][0]["path"]

        status, _ = self._request("POST", f"/api/games/{game_id}/move", payload={"path": chosen})
        self.assertEqual(status, 200)
        status, reset = self._request("POST", f"/api/games/{game_id}/reset")
        self.assertEqual(status, 200)
        self.assertEqual(reset["game_id"], game_id)
        self.assertEqual(reset["turn"], "red")
        self.assertEqual(reset["status"], "in_progress")
        self.assertIsNone(reset["last_move"])

    def test_bad_payload_returns_422(self) -> None:
        created = self._create_game()
        game_id = created["game_id"]
        status, data = self._request(
            "POST",
            f"/api/games/{game_id}/move",
            payload={"path": [[5, 0]]},
        )
        self.assertEqual(status, 422)
        self.assertIn("detail", data)


if __name__ == "__main__":
    unittest.main(verbosity=2)

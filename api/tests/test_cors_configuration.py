from __future__ import annotations

import os
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "src"
if str(SRC) not in sys.path:
    sys.path.insert(0, str(SRC))

from fastapi.middleware.cors import CORSMiddleware  # noqa: E402

from api.main import create_app  # noqa: E402


class CORSConfigurationTests(unittest.TestCase):
    def setUp(self) -> None:
        self._old_origins = os.environ.get("CHECKERS_CORS_ORIGINS")

    def tearDown(self) -> None:
        if self._old_origins is None:
            os.environ.pop("CHECKERS_CORS_ORIGINS", None)
        else:
            os.environ["CHECKERS_CORS_ORIGINS"] = self._old_origins

    def test_cors_middleware_is_not_enabled_by_default(self) -> None:
        os.environ.pop("CHECKERS_CORS_ORIGINS", None)
        app = create_app()
        middleware_types = [entry.cls for entry in app.user_middleware]
        self.assertNotIn(CORSMiddleware, middleware_types)

    def test_cors_middleware_is_enabled_when_origins_set(self) -> None:
        os.environ["CHECKERS_CORS_ORIGINS"] = "https://example.netlify.app,http://localhost:5173"
        app = create_app()
        middleware_types = [entry.cls for entry in app.user_middleware]
        self.assertIn(CORSMiddleware, middleware_types)


if __name__ == "__main__":
    unittest.main(verbosity=2)

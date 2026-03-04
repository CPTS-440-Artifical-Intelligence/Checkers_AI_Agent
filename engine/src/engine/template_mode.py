from __future__ import annotations

import os


def is_template_mode_enabled() -> bool:
    value = os.getenv("CHECKERS_ENGINE_TEMPLATE_MODE", "").strip().lower()
    return value in {"1", "true", "yes", "on"}

from __future__ import annotations

import json
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any


@dataclass(frozen=True, slots=True)
class SharedAIEngineConfig:
    type: str
    max_depth: int
    time_limit_ms: int
    seed: int | None


def _config_path() -> Path:
    return Path(__file__).resolve().parents[1] / "shared" / "checkers_ai_config.json"


def _parse_engine_config(raw_payload: dict[str, Any]) -> SharedAIEngineConfig:
    raw_engine = raw_payload.get("engine")
    if not isinstance(raw_engine, dict):
        raise ValueError("Shared AI config must contain an 'engine' object.")

    return SharedAIEngineConfig(
        type=str(raw_engine["type"]),
        max_depth=int(raw_engine["max_depth"]),
        time_limit_ms=int(raw_engine["time_limit_ms"]),
        seed=None if raw_engine.get("seed") is None else int(raw_engine["seed"]),
    )


@lru_cache(maxsize=1)
def load_shared_ai_engine_config() -> SharedAIEngineConfig:
    with _config_path().open("r", encoding="utf-8") as config_file:
        payload = json.load(config_file)

    if not isinstance(payload, dict):
        raise ValueError("Shared AI config root must be a JSON object.")

    return _parse_engine_config(payload)


SHARED_AI_ENGINE_CONFIG = load_shared_ai_engine_config()

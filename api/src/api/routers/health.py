from __future__ import annotations

from fastapi import APIRouter

router = APIRouter()
_HEALTH_OK = {"ok": True}


@router.get("/health")
def health() -> dict[str, bool]:
    return _HEALTH_OK

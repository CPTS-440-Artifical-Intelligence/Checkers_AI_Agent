import os

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.errors import register_exception_handlers
from api.routers.games import router as games_router
from api.routers.health import router as health_router


def _build_api_router() -> APIRouter:
    router = APIRouter(prefix="/api")
    router.include_router(health_router, tags=["health"])
    router.include_router(games_router, tags=["games"])
    return router


def _parse_cors_origins() -> list[str]:
    raw = os.getenv("CHECKERS_CORS_ORIGINS", "").strip()
    if not raw:
        return []
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _configure_cors(app: FastAPI) -> None:
    origins = _parse_cors_origins()
    if not origins:
        return
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def create_app() -> FastAPI:
    app = FastAPI(title="Checkers API")
    _configure_cors(app)
    app.include_router(_build_api_router())
    register_exception_handlers(app)
    return app


app = create_app()

from fastapi import APIRouter, FastAPI

from api.errors import register_exception_handlers
from api.routers.games import router as games_router
from api.routers.health import router as health_router


def _build_api_router() -> APIRouter:
    router = APIRouter(prefix="/api")
    router.include_router(health_router, tags=["health"])
    router.include_router(games_router, tags=["games"])
    return router


def create_app() -> FastAPI:
    app = FastAPI(title="Checkers API")
    app.include_router(_build_api_router())
    register_exception_handlers(app)
    return app


app = create_app()

from fastapi import APIRouter, FastAPI

from api.errors import register_exception_handlers
from api.routers.games import router as games_router
from api.routers.health import router as health_router


def create_app() -> FastAPI:
    app = FastAPI(title="Checkers API")
    api_router = APIRouter(prefix="/api")

    api_router.include_router(health_router, tags=["health"])
    api_router.include_router(games_router, tags=["games"])

    app.include_router(api_router)
    register_exception_handlers(app)
    return app


app = create_app()

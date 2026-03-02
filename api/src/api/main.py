from fastapi import APIRouter, FastAPI

app = FastAPI(title="Checkers API")

api_router = APIRouter(prefix="/api")


@api_router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


app.include_router(api_router)

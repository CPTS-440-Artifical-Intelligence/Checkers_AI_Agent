from __future__ import annotations

import asyncio
import json
from typing import Any
from urllib.parse import urlsplit


async def _request(app: Any, method: str, path: str, payload: Any | None = None) -> tuple[int, Any]:
    split = urlsplit(path)
    body = b""
    headers: list[tuple[bytes, bytes]] = [(b"host", b"testserver")]
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")
        headers.append((b"content-type", b"application/json"))
        headers.append((b"content-length", str(len(body)).encode("ascii")))

    events: list[dict[str, Any]] = [{"type": "http.request", "body": body, "more_body": False}]
    sent: list[dict[str, Any]] = []

    async def receive() -> dict[str, Any]:
        if events:
            return events.pop(0)
        return {"type": "http.disconnect"}

    async def send(message: dict[str, Any]) -> None:
        sent.append(message)

    scope = {
        "type": "http",
        "asgi": {"version": "3.0", "spec_version": "2.3"},
        "http_version": "1.1",
        "method": method.upper(),
        "scheme": "http",
        "path": split.path,
        "raw_path": split.path.encode("ascii"),
        "query_string": split.query.encode("ascii"),
        "headers": headers,
        "client": ("testclient", 50000),
        "server": ("testserver", 80),
    }

    await app(scope, receive, send)

    start = next(msg for msg in sent if msg["type"] == "http.response.start")
    response_body = b"".join(msg.get("body", b"") for msg in sent if msg["type"] == "http.response.body")
    if not response_body:
        return start["status"], None
    return start["status"], json.loads(response_body.decode("utf-8"))


def request(app: Any, method: str, path: str, payload: Any | None = None) -> tuple[int, Any]:
    return asyncio.run(_request(app=app, method=method, path=path, payload=payload))


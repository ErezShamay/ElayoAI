"""Shared test helper for walking a FastAPI app's registered routes.

Starlette 1.x changed `app.routes` so that routes added via
`include_router()` are wrapped in a lazy `_IncludedRouter` proxy instead of
being eagerly flattened into the top-level list - `route.path` is only
available on the leaf `Route`/`APIRoute` objects, not on the wrapper. This
helper recurses through the wrapper (via its `original_router.routes`) so
callers can keep asserting against flat route paths regardless of how many
`include_router()` layers are involved.
"""
from __future__ import annotations

from typing import Iterator

from fastapi import FastAPI
from starlette.routing import BaseRoute


def iter_leaf_routes(app: FastAPI) -> Iterator[BaseRoute]:
    """Yields every leaf route (the objects that actually have `.path`),
    recursing into any `_IncludedRouter` wrappers produced by
    `app.include_router(...)`."""

    def _walk(routes) -> Iterator[BaseRoute]:
        for route in routes:
            nested_router = getattr(route, "original_router", None)
            if nested_router is not None:
                yield from _walk(nested_router.routes)
            else:
                yield route

    yield from _walk(app.routes)


def has_route_path(app: FastAPI, path: str) -> bool:
    return any(getattr(route, "path", None) == path for route in iter_leaf_routes(app))

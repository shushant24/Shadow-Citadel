"""Result envelope shared by every endpoint (demo plan Section 6.1)."""
from __future__ import annotations

from typing import Any, Literal

Status = Literal["optimal", "infeasible", "unbounded"]


def envelope(status: Status, answer: dict[str, Any] | None = None,
             steps: list[dict[str, Any]] | None = None) -> dict[str, Any]:
    return {"status": status, "answer": answer or {}, "steps": steps or []}

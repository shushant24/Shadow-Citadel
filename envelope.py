"""Result envelope shared by every endpoint (docs/api-contract.md).

Non-optimal results (infeasible / unbounded) must carry a human-readable `answer.message`
that the frontend can show as-is.
"""
from __future__ import annotations

from typing import Any, Literal

Status = Literal["optimal", "infeasible", "unbounded"]


def envelope(status: Status, answer: dict[str, Any] | None = None,
             steps: list[dict[str, Any]] | None = None, message: str | None = None) -> dict[str, Any]:
    body = dict(answer or {})
    if message is not None:
        body["message"] = message
    if status != "optimal" and "message" not in body:
        raise ValueError("infeasible / unbounded results need a message")
    return {"status": status, "answer": body, "steps": steps or []}

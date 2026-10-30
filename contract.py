"""Executable version of docs/api-contract.md (no dependencies, so it runs anywhere).

    check("craft", payload)        # validates a whole envelope incl. every step
    check_steps("route", steps)    # validates only a steps list (use on solver output)

Raises ContractError with a path such as  steps[3].pivot  when something deviates.
"""
from __future__ import annotations

from typing import Any, Callable

STATUSES = {"optimal", "infeasible", "unbounded"}
METHODS = {"bigm", "twophase"}


class ContractError(ValueError):
    pass


def _fail(path: str, msg: str):
    raise ContractError(f"{path}: {msg}")


def is_num(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def _num(v, path):
    if not is_num(v):
        _fail(path, f"expected a number, got {v!r}")


def _int(v, path, minimum=None):
    if not isinstance(v, int) or isinstance(v, bool):
        _fail(path, f"expected an integer, got {v!r}")
    if minimum is not None and v < minimum:
        _fail(path, f"expected >= {minimum}, got {v}")


def _str(v, path):
    if not isinstance(v, str):
        _fail(path, f"expected a string, got {v!r}")


def _list(v, path):
    if not isinstance(v, list):
        _fail(path, f"expected a list, got {type(v).__name__}")


def _dict(v, path):
    if not isinstance(v, dict):
        _fail(path, f"expected an object, got {type(v).__name__}")


def _has(d: dict, keys, path):
    missing = [k for k in keys if k not in d]
    if missing:
        _fail(path, f"missing key(s) {missing}")


def _str_list(v, path):
    _list(v, path)
    for i, s in enumerate(v):
        _str(s, f"{path}[{i}]")


def _matrix(v, path, rect=True):
    _list(v, path)
    for i, row in enumerate(v):
        _list(row, f"{path}[{i}]")
        for j, x in enumerate(row):
            _num(x, f"{path}[{i}][{j}]")
    if rect and v and len({len(r) for r in v}) != 1:
        _fail(path, "rows have different lengths")


def _answer_craft(a, path):
    _has(a, ["x", "z", "shadow_prices", "binding", "method", "constraint_names"], path)
    _list(a["x"], f"{path}.x")
    for i, v in enumerate(a["x"]):
        _num(v, f"{path}.x[{i}]")
    _num(a["z"], f"{path}.z")
    sp = a["shadow_prices"]
    _dict(sp, f"{path}.shadow_prices")
    _has(sp, ["time", "weight", "slots"], f"{path}.shadow_prices")
    for k, v in sp.items():
        _num(v, f"{path}.shadow_prices.{k}")
    _str_list(a["binding"], f"{path}.binding")
    if a["method"] not in METHODS:
        _fail(f"{path}.method", f"must be one of {sorted(METHODS)}")
    _str_list(a["constraint_names"], f"{path}.constraint_names")


def _step_craft(s, path, ctx):
    _has(s, ["iteration", "phase", "columns", "basis", "tableau", "zrow", "entering", "leaving",
             "pivot", "z", "z_m"], path)
    _int(s["iteration"], f"{path}.iteration", 0)
    _str_list(s["columns"], f"{path}.columns")
    _str_list(s["basis"], f"{path}.basis")
    _matrix(s["tableau"], f"{path}.tableau")
    width = len(s["columns"]) + 1
    if len(s["tableau"]) != len(s["basis"]):
        _fail(path, "tableau needs one row per basic variable")
    for i, row in enumerate(s["tableau"]):
        if len(row) != width:
            _fail(f"{path}.tableau[{i}]", f"expected {width} entries (columns + RHS)")
    zr = s["zrow"]
    _dict(zr, f"{path}.zrow")
    _has(zr, ["c", "m"], f"{path}.zrow")
    for k in ("c", "m"):
        _list(zr[k], f"{path}.zrow.{k}")
        if len(zr[k]) != width:
            _fail(f"{path}.zrow.{k}", f"expected {width} entries (columns + RHS)")
    _num(s["z"], f"{path}.z")
    _num(s["z_m"], f"{path}.z_m")


def check(kind: str, payload: dict) -> None:
    _dict(payload, "response")
    _has(payload, ["status", "answer", "steps"], "response")
    if payload["status"] not in STATUSES:
        _fail("response.status", f"must be one of {sorted(STATUSES)}")
    _dict(payload["answer"], "response.answer")
    if payload["status"] == "optimal":
        if kind == "craft":
            _answer_craft(payload["answer"], "answer")
    else:
        _has(payload["answer"], ["message"], "answer")
        _str(payload["answer"]["message"], "answer.message")
    if kind == "craft":
        for i, s in enumerate(payload["steps"]):
            _step_craft(s, f"steps[{i}]", None)

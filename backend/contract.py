"""Executable version of docs/api-contract.md (no dependencies, so it runs anywhere).

    check("craft", payload)        # validates a whole envelope incl. every step
    check_steps("route", steps)    # validates only a steps list (use on solver output)

Raises ContractError with a path such as  steps[3].pivot  when something deviates.
The shared fixtures, the solvers and the live endpoints are all checked against this file,
so a format change means editing docs/api-contract.md, this file, and the fixtures together.
"""
from __future__ import annotations

from typing import Any, Callable

STATUSES = {"optimal", "infeasible", "unbounded"}
ASSIGN_PHASES = {"convert", "row_reduce", "col_reduce", "cover", "adjust", "final"}
BB_STATUSES = {"branch", "pruned", "feasible"}
HULL_ACTIONS = {"push", "pop", "skip"}
CRAFT_PHASES = {"bigm", "phase1", "phase2"}
METHODS = {"bigm", "twophase"}
ROUTE_POLICIES = {"optimal", "nearest_neighbour"}


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


def _int_list(v, path, minimum=1):
    _list(v, path)
    for i, s in enumerate(v):
        _int(s, f"{path}[{i}]", minimum)


def _matrix(v, path, rect=True):
    _list(v, path)
    for i, row in enumerate(v):
        _list(row, f"{path}[{i}]")
        for j, x in enumerate(row):
            _num(x, f"{path}[{i}][{j}]")
    if rect and v and len({len(r) for r in v}) != 1:
        _fail(path, "rows have different lengths")


def _pair_list(v, path, kind):
    _list(v, path)
    for i, p in enumerate(v):
        _list(p, f"{path}[{i}]")
        if len(p) != 2:
            _fail(f"{path}[{i}]", "expected a pair")
        for k, x in enumerate(p):
            (_int(x, f"{path}[{i}][{k}]", 1) if kind == "int" else _str(x, f"{path}[{i}][{k}]"))


# ------------------------------------------------------------------ answers
def _answer_hull(a, path):
    _has(a, ["vertices", "interior"], path)
    _str_list(a["vertices"], f"{path}.vertices")
    _str_list(a["interior"], f"{path}.interior")
    if set(a["vertices"]) & set(a["interior"]):
        _fail(path, "a point cannot be both a vertex and interior")


def _answer_route(a, path):
    _has(a, ["tour", "cost", "relaxation_cost", "first_subtours", "nearest_neighbour"], path)
    _str_list(a["tour"], f"{path}.tour")
    if len(a["tour"]) < 2 or a["tour"][0] != a["tour"][-1]:
        _fail(f"{path}.tour", "a tour must start and end at the same node")
    if len(set(a["tour"][:-1])) != len(a["tour"]) - 1:
        _fail(f"{path}.tour", "a node is visited twice")
    _num(a["cost"], f"{path}.cost")
    _num(a["relaxation_cost"], f"{path}.relaxation_cost")
    if a["relaxation_cost"] > a["cost"]:
        _fail(path, "relaxation_cost cannot exceed the optimal cost")
    _list(a["first_subtours"], f"{path}.first_subtours")
    for i, s in enumerate(a["first_subtours"]):
        _str_list(s, f"{path}.first_subtours[{i}]")
    nn = a["nearest_neighbour"]
    _dict(nn, f"{path}.nearest_neighbour")
    _has(nn, ["tour", "cost"], f"{path}.nearest_neighbour")
    _str_list(nn["tour"], f"{path}.nearest_neighbour.tour")
    _num(nn["cost"], f"{path}.nearest_neighbour.cost")


def _answer_assign(a, path):
    _has(a, ["pairs", "total", "unassigned"], path)
    _pair_list(a["pairs"], f"{path}.pairs", "int")
    _num(a["total"], f"{path}.total")
    u = a["unassigned"]
    _dict(u, f"{path}.unassigned")
    _has(u, ["rows", "cols"], f"{path}.unassigned")
    _int_list(u["rows"], f"{path}.unassigned.rows")
    _int_list(u["cols"], f"{path}.unassigned.cols")
    rows = [p[0] for p in a["pairs"]]
    cols = [p[1] for p in a["pairs"]]
    if len(set(rows)) != len(rows) or len(set(cols)) != len(cols):
        _fail(f"{path}.pairs", "a row or column is used twice")


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


def _answer_pipeline(a, path):
    _has(a, ["tour_time", "craft_time", "combat", "crafting", "total", "route_policy", "tour"], path)
    for k in ("tour_time", "craft_time", "combat"):
        _num(a[k], f"{path}.{k}")
    for k in ("crafting", "total"):  # null when crafting is infeasible
        if a[k] is not None:
            _num(a[k], f"{path}.{k}")
    if (a["crafting"] is None) != (a["total"] is None):
        _fail(path, "crafting and total must both be null or both be numbers")
    if a["route_policy"] not in ROUTE_POLICIES:
        _fail(f"{path}.route_policy", f"must be one of {sorted(ROUTE_POLICIES)}")
    _str_list(a["tour"], f"{path}.tour")


def _answer_experiments(a, path):
    _has(a, ["modules", "random_maps"], path)
    _list(a["modules"], f"{path}.modules")
    for i, m in enumerate(a["modules"]):
        p = f"{path}.modules[{i}]"
        _has(m, ["module", "naive", "optimized", "unit", "gain_pct", "direction"], p)
        _str(m["module"], f"{p}.module")
        if m["direction"] not in {"lower_is_better", "higher_is_better"}:
            _fail(f"{p}.direction", "must be lower_is_better or higher_is_better")
        for k in ("naive", "gain_pct"):
            if m[k] is not None:
                _num(m[k], f"{p}.{k}")
        _num(m["optimized"], f"{p}.optimized")
    rm = a["random_maps"]
    if rm is not None:
        _dict(rm, f"{path}.random_maps")
        _has(rm, ["n", "avg_route_gain_pct", "avg_assign_gain_pct", "avg_solver_ms", "maps"], f"{path}.random_maps")
        _list(rm["maps"], f"{path}.random_maps.maps")
        if rm["n"] != len(rm["maps"]):
            _fail(f"{path}.random_maps", "n must equal len(maps)")


# ------------------------------------------------------------------ steps
def _step_hull(s, path, ctx):
    _has(s, ["action", "point", "stack"], path)
    if s["action"] not in HULL_ACTIONS:
        _fail(f"{path}.action", f"must be one of {sorted(HULL_ACTIONS)}")
    _str(s["point"], f"{path}.point")
    _str_list(s["stack"], f"{path}.stack")


def _step_route(s, path, ctx):
    _has(s, ["node", "parent", "forbidden_arcs", "branched_arc", "assignment", "cost",
             "subtours", "status", "incumbent"], path)
    _int(s["node"], f"{path}.node", 1)
    if s["parent"] is not None:
        _int(s["parent"], f"{path}.parent", 1)
        if s["parent"] >= s["node"]:
            _fail(f"{path}.parent", "a parent is solved before its children (parent < node)")
    elif s["node"] != 1:
        _fail(f"{path}.parent", "only the root (node 1) has parent null")
    _pair_list(s["forbidden_arcs"], f"{path}.forbidden_arcs", "str")
    if s["branched_arc"] is not None:
        _pair_list([s["branched_arc"]], f"{path}.branched_arc", "str")
        if s["branched_arc"] not in s["forbidden_arcs"]:
            _fail(f"{path}.branched_arc", "must be one of forbidden_arcs")
    _pair_list(s["assignment"], f"{path}.assignment", "str")
    if s["cost"] is not None:
        _num(s["cost"], f"{path}.cost")
    _list(s["subtours"], f"{path}.subtours")
    for i, t in enumerate(s["subtours"]):
        _str_list(t, f"{path}.subtours[{i}]")
    if s["status"] not in BB_STATUSES:
        _fail(f"{path}.status", f"must be one of {sorted(BB_STATUSES)}")
    if s["status"] == "branch" and len(s["subtours"]) < 2:
        _fail(path, "a branch node must show at least two subtours")
    if s["incumbent"] is not None:
        _num(s["incumbent"], f"{path}.incumbent")


def _step_assign(s, path, ctx):
    _has(s, ["phase", "matrix", "covered_rows", "covered_cols", "dummy_rows", "dummy_cols"], path)
    if s["phase"] not in ASSIGN_PHASES:
        _fail(f"{path}.phase", f"must be one of {sorted(ASSIGN_PHASES)}")
    _matrix(s["matrix"], f"{path}.matrix")
    n_r, n_c = len(s["matrix"]), len(s["matrix"][0]) if s["matrix"] else 0
    for key, limit in (("covered_rows", n_r), ("dummy_rows", n_r), ("covered_cols", n_c), ("dummy_cols", n_c)):
        _int_list(s[key], f"{path}.{key}")
        if any(i > limit for i in s[key]):
            _fail(f"{path}.{key}", f"indices are 1-based and must be <= {limit}")
    if s["phase"] == "final":
        _has(s, ["selected"], path)
        _pair_list(s["selected"], f"{path}.selected", "int")
    if s["phase"] == "adjust":
        _has(s, ["delta"], path)
        _num(s["delta"], f"{path}.delta")


def _step_craft(s, path, ctx):
    _has(s, ["iteration", "phase", "columns", "basis", "tableau", "zrow", "entering", "leaving",
             "pivot", "z", "z_m"], path)
    _int(s["iteration"], f"{path}.iteration", 0)
    if s["phase"] not in CRAFT_PHASES:
        _fail(f"{path}.phase", f"must be one of {sorted(CRAFT_PHASES)}")
    _str_list(s["columns"], f"{path}.columns")
    _str_list(s["basis"], f"{path}.basis")
    _matrix(s["tableau"], f"{path}.tableau")
    width = len(s["columns"]) + 1  # last column is the right-hand side
    if len(s["tableau"]) != len(s["basis"]):
        _fail(path, "tableau needs one row per basic variable")
    for i, row in enumerate(s["tableau"]):
        if len(row) != width:
            _fail(f"{path}.tableau[{i}]", f"expected {width} entries (columns + RHS)")
    for b in s["basis"]:
        if b not in s["columns"]:
            _fail(f"{path}.basis", f"{b!r} is not a column")
    zr = s["zrow"]
    _dict(zr, f"{path}.zrow")
    _has(zr, ["c", "m"], f"{path}.zrow")
    for k in ("c", "m"):
        _list(zr[k], f"{path}.zrow.{k}")
        if len(zr[k]) != width:
            _fail(f"{path}.zrow.{k}", f"expected {width} entries (columns + RHS)")
        for j, v in enumerate(zr[k]):
            _num(v, f"{path}.zrow.{k}[{j}]")
    _num(s["z"], f"{path}.z")
    _num(s["z_m"], f"{path}.z_m")
    if s["pivot"] is None:
        if s["leaving"] is not None:  # entering without leaving is the "unbounded" step
            _fail(f"{path}.leaving", "must be null when there is no pivot")
    else:
        _list(s["pivot"], f"{path}.pivot")
        if len(s["pivot"]) != 2:
            _fail(f"{path}.pivot", "expected [row, col]")
        r, c = s["pivot"]
        _int(r, f"{path}.pivot[0]", 0)
        _int(c, f"{path}.pivot[1]", 0)
        if r >= len(s["tableau"]) or c >= len(s["columns"]):
            _fail(f"{path}.pivot", "outside the tableau")
        if s["entering"] != s["columns"][c]:
            _fail(f"{path}.entering", f"must equal columns[pivot col] = {s['columns'][c]!r}")
        if s["leaving"] != s["basis"][r]:
            _fail(f"{path}.leaving", f"must equal basis[pivot row] = {s['basis'][r]!r}")


ANSWERS: dict[str, Callable] = {
    "hull": _answer_hull, "route": _answer_route, "assign": _answer_assign,
    "craft": _answer_craft, "pipeline": _answer_pipeline, "experiments": _answer_experiments,
}
STEPS: dict[str, Callable] = {
    "hull": _step_hull, "route": _step_route, "assign": _step_assign, "craft": _step_craft,
}


def check_steps(kind: str, steps: list, path: str = "steps") -> None:
    _list(steps, path)
    if kind not in STEPS:
        if steps:
            _fail(path, f"{kind} endpoints return no steps")
        return
    for i, s in enumerate(steps):
        _dict(s, f"{path}[{i}]")
        STEPS[kind](s, f"{path}[{i}]", None)
    if kind == "craft":
        for i in range(1, len(steps)):  # the stepper needs a consistent table across iterations
            if steps[i]["phase"] == steps[i - 1]["phase"] and steps[i]["columns"] != steps[i - 1]["columns"]:
                _fail(f"{path}[{i}].columns", "columns may only change between phase1 and phase2")


def check(kind: str, payload: dict) -> None:
    """Validate a full envelope returned by endpoint `kind` (hull, route, assign, craft, pipeline, experiments)."""
    _dict(payload, "response")
    _has(payload, ["status", "answer", "steps"], "response")
    if payload["status"] not in STATUSES:
        _fail("response.status", f"must be one of {sorted(STATUSES)}")
    _dict(payload["answer"], "response.answer")
    if payload["status"] == "optimal":
        ANSWERS[kind](payload["answer"], "answer")
    else:
        if kind == "pipeline":
            _has(payload["answer"], ["message", "route_policy"], "answer")
        else:
            _has(payload["answer"], ["message"], "answer")
        _str(payload["answer"]["message"], "answer.message")
    check_steps(kind, payload["steps"])

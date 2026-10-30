"""Part 2: /api/craft (builds the LP, calls Part 1's engine, adds sensitivity)."""
from __future__ import annotations

import math
from typing import Dict, List, Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from envelope import envelope
from solvers.bigm import solve_bigm
from solvers.twophase import solve_twophase
from solvers.sensitivity import binding_constraints, bottleneck_text, shadow_prices

router = APIRouter()

CONSTRAINT_NAMES = ["time", "weight", "stamina", "survival", "slots"]
MAX_RECIPES = 50


class CraftRequest(BaseModel):
    time_limit: float
    recipes: Dict[str, List[float]]
    limits: Dict[str, float]
    method: Literal["bigm", "twophase"] = "bigm"

    @field_validator("time_limit")
    @classmethod
    def check_time_limit(cls, v: float) -> float:
        if not math.isfinite(v):
            raise ValueError("time_limit must be a finite number.")
        if v < 0:
            raise ValueError("time_limit cannot be negative.")
        return v

    @field_validator("recipes")
    @classmethod
    def check_recipes(cls, v: Dict[str, List[float]]) -> Dict[str, List[float]]:
        required = {"score", "time", "weight", "stamina", "survival"}
        missing = required - set(v)
        if missing:
            raise ValueError(f"recipes missing required keys: {sorted(missing)}")
        lengths = {k: len(lst) for k, lst in v.items() if k in required}
        if len(set(lengths.values())) != 1:
            raise ValueError(f"recipes lists have different lengths: {lengths}")
        n = next(iter(lengths.values()))
        if n == 0:
            raise ValueError("recipes lists must be non-empty.")
        if n > MAX_RECIPES:
            raise ValueError(f"recipes cannot contain more than {MAX_RECIPES} items.")
        for key in required:
            for i, val in enumerate(v[key]):
                if not isinstance(val, (int, float)) or isinstance(val, bool) or not math.isfinite(val):
                    raise ValueError(f"recipes['{key}'][{i}] must be a finite number.")
        return v

    @field_validator("limits")
    @classmethod
    def check_limits(cls, v: Dict[str, float]) -> Dict[str, float]:
        required = {"weight", "stamina", "survival_min", "slots"}
        missing = required - set(v)
        if missing:
            raise ValueError(f"limits missing required keys: {sorted(missing)}")
        for key in required:
            val = v[key]
            if not isinstance(val, (int, float)) or isinstance(val, bool) or not math.isfinite(val):
                raise ValueError(f"limits['{key}'] must be a finite number.")
        return v


@router.post("/craft")
def post_craft(req: CraftRequest) -> dict:
    # 1. Objective function (maximize score)
    c = [float(v) for v in req.recipes["score"]]
    n_vars = len(c)

    # 2. Constraints: time (<=), weight (<=), stamina (<=), survival (>=), slots (=)
    A = [
        [float(v) for v in req.recipes["time"]],
        [float(v) for v in req.recipes["weight"]],
        [float(v) for v in req.recipes["stamina"]],
        [float(v) for v in req.recipes["survival"]],
        [1.0] * n_vars,  # slots equality constraint
    ]

    b = [
        float(req.time_limit),
        float(req.limits["weight"]),
        float(req.limits["stamina"]),
        float(req.limits["survival_min"]),
        float(req.limits["slots"]),
    ]

    senses = ["<=", "<=", "<=", ">=", "="]

    # 3. Solve via Part 1 solver (only map ValueError to 422; let RuntimeError produce 500)
    solver = solve_twophase if req.method == "twophase" else solve_bigm
    try:
        res = solver(c, A, b, senses, maximize=True)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    # 4. If infeasible or unbounded, return solver envelope directly
    if res["status"] != "optimal":
        return res

    # 5. Sensitivity analysis on final tableau
    final_step = res["steps"][-1]
    sp_all = shadow_prices(final_step, CONSTRAINT_NAMES)

    # Contract requires time, weight, slots always present in shadow_prices
    sp_output = {name: sp_all.get(name, 0.0) for name in CONSTRAINT_NAMES}
    binding = binding_constraints(final_step, CONSTRAINT_NAMES)
    b_text = bottleneck_text(sp_all)

    answer = dict(res["answer"])
    answer["shadow_prices"] = sp_output
    answer["binding"] = binding
    answer["method"] = req.method
    answer["constraint_names"] = CONSTRAINT_NAMES
    answer["bottleneck"] = b_text

    return envelope("optimal", answer=answer, steps=res["steps"])

"""Part 2: /api/craft (builds the LP, calls Part 1's engine, adds sensitivity)."""
from typing import Any, Dict, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from envelope import envelope
from solvers.bigm import solve_bigm
from solvers.twophase import solve_twophase
from solvers.sensitivity import bottleneck_text, shadow_prices

router = APIRouter()


class CraftRequest(BaseModel):
    time_limit: float
    recipes: Dict[str, Any]
    limits: Dict[str, Any]
    method: Literal["bigm", "twophase"] = "bigm"


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
    constraint_names = ["time", "weight", "stamina", "survival", "slots"]

    # 3. Solve via Part 1 solver
    solver = solve_twophase if req.method == "twophase" else solve_bigm
    res = solver(c, A, b, senses, maximize=True)

    # 4. If infeasible or unbounded, return solver envelope directly
    if res["status"] != "optimal":
        return res

    # 5. Sensitivity analysis on final tableau
    final_step = res["steps"][-1]
    sp_all = shadow_prices(final_step, constraint_names)

    binding = [name for name in constraint_names if sp_all.get(name, 0.0) > 1e-6]
    sp_output = {k: v for k, v in sp_all.items() if v > 1e-6}
    b_text = bottleneck_text(sp_all)

    answer = dict(res["answer"])
    answer["shadow_prices"] = sp_output
    answer["binding"] = binding
    answer["method"] = req.method
    answer["constraint_names"] = constraint_names
    answer["bottleneck"] = b_text

    return envelope("optimal", answer=answer, steps=res["steps"])

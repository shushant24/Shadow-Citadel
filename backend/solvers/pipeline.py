"""Part 5: Chain tour time into craft time and total the score."""

from __future__ import annotations

import math
from typing import Any, Dict

from envelope import envelope
from solvers.bigm import solve_bigm
from solvers.geometry import time_matrix
from solvers.hungarian import solve_assignment
from solvers.tsp import solve_tsp

VALID_ROUTES = {"optimal", "nearest_neighbour"}
REQUIRED_SCENARIO_KEYS = {"total_time", "nodes", "weapon_boss_scores", "recipes", "limits"}
REQUIRED_RECIPES_KEYS = {"score", "time", "weight", "stamina", "survival"}
REQUIRED_LIMITS_KEYS = {"weight", "stamina", "survival_min", "slots"}


def run_pipeline(scenario: Dict[str, Any], route: str = "optimal") -> Dict[str, Any]:
    """route: "optimal" (Hungarian + branching tour) or "nearest_neighbour" (naive baseline).

    craft_time = scenario["total_time"] - tour_time. Return an envelope.
    optimal            -> status "optimal", answer tour_time 70, craft_time 50, combat 445, crafting 117, total 562.
    nearest_neighbour  -> status "infeasible", tour_time 80, craft_time 40, combat 445, crafting None, total None
                          and a message (combat does not depend on the route).
    Both answers also carry route_policy and tour (list of labels). See fixtures/pipeline*.json.
    The time matrix comes from solvers.geometry.time_matrix(scenario["nodes"], labels).
    """
    if route not in VALID_ROUTES:
        raise ValueError(f"route must be one of {sorted(VALID_ROUTES)}, got {route!r}")

    if not isinstance(scenario, dict):
        raise ValueError("scenario must be a dictionary")

    missing = REQUIRED_SCENARIO_KEYS - set(scenario.keys())
    if missing:
        raise ValueError(f"scenario missing required keys: {sorted(missing)}")

    total_time = scenario["total_time"]
    if not isinstance(total_time, (int, float)) or isinstance(total_time, bool) or not math.isfinite(total_time) or total_time <= 0:
        raise ValueError("total_time must be a finite positive number")

    nodes = scenario["nodes"]
    if not isinstance(nodes, dict) or len(nodes) < 2:
        raise ValueError("nodes must be a dictionary with at least two points")

    recipes = scenario["recipes"]
    if not isinstance(recipes, dict):
        raise ValueError("recipes must be a dictionary")
    missing_recipes = REQUIRED_RECIPES_KEYS - set(recipes.keys())
    if missing_recipes:
        raise ValueError(f"recipes missing required keys: {sorted(missing_recipes)}")

    limits = scenario["limits"]
    if not isinstance(limits, dict):
        raise ValueError("limits must be a dictionary")
    missing_limits = REQUIRED_LIMITS_KEYS - set(limits.keys())
    if missing_limits:
        raise ValueError(f"limits missing required keys: {sorted(missing_limits)}")

    # 1. Routing calculation
    labels = list(nodes.keys())
    dist_matrix = time_matrix(nodes, labels)
    tsp_res = solve_tsp(dist_matrix, labels)

    if route == "optimal":
        tour = tsp_res["answer"]["tour"]
        tour_time = tsp_res["answer"]["cost"]
    else:
        tour = tsp_res["answer"]["nearest_neighbour"]["tour"]
        tour_time = tsp_res["answer"]["nearest_neighbour"]["cost"]

    if isinstance(tour_time, float) and tour_time.is_integer():
        tour_time = int(tour_time)

    # 2. Craft time calculation
    craft_time = total_time - tour_time
    if isinstance(craft_time, float) and craft_time.is_integer():
        craft_time = int(craft_time)

    # 3. Combat assignment
    scores = scenario["weapon_boss_scores"]
    assign_res = solve_assignment(scores, maximize=True)
    combat = assign_res["answer"]["total"]
    if isinstance(combat, float) and combat.is_integer():
        combat = int(combat)

    # Format slots for display in message
    slots_val = limits["slots"]
    slots_str = str(int(slots_val)) if isinstance(slots_val, (int, float)) and int(slots_val) == slots_val else str(slots_val)
    policy_name = route.replace("_", "-")

    # 4. Crafting optimization via Big-M LP
    if craft_time < 0:
        message = (
            f"The {policy_name} tour takes {tour_time} minutes, leaving {craft_time} minutes of "
            f"crafting time: the {slots_str}-slot crafting plan is infeasible, so there is no total score."
        )
        answer = {
            "tour_time": tour_time,
            "craft_time": craft_time,
            "combat": combat,
            "crafting": None,
            "total": None,
            "route_policy": route,
            "tour": tour,
            "message": message,
        }
        return envelope("infeasible", answer=answer, steps=[])

    c = [float(v) for v in recipes["score"]]
    n_vars = len(c)
    A = [
        [float(v) for v in recipes["time"]],
        [float(v) for v in recipes["weight"]],
        [float(v) for v in recipes["stamina"]],
        [float(v) for v in recipes["survival"]],
        [1.0] * n_vars,
    ]
    b = [
        float(craft_time),
        float(limits["weight"]),
        float(limits["stamina"]),
        float(limits["survival_min"]),
        float(limits["slots"]),
    ]
    senses = ["<=", "<=", "<=", ">=", "="]

    craft_res = solve_bigm(c, A, b, senses, maximize=True)

    if craft_res["status"] != "optimal":
        message = (
            f"The {policy_name} tour takes {tour_time} minutes, leaving {craft_time} minutes of "
            f"crafting time: the {slots_str}-slot crafting plan is infeasible, so there is no total score."
        )
        answer = {
            "tour_time": tour_time,
            "craft_time": craft_time,
            "combat": combat,
            "crafting": None,
            "total": None,
            "route_policy": route,
            "tour": tour,
            "message": message,
        }
        return envelope("infeasible", answer=answer, steps=[])

    z = craft_res["answer"]["z"]
    crafting = int(round(z)) if round(z) == z else z
    total_score = combat + crafting
    total = int(round(total_score)) if round(total_score) == total_score else total_score

    answer = {
        "tour_time": tour_time,
        "craft_time": craft_time,
        "combat": combat,
        "crafting": crafting,
        "total": total,
        "route_policy": route,
        "tour": tour,
    }
    return envelope("optimal", answer=answer, steps=[])

"""Part 10: 20 seeded random maps (8 to 10 nodes): average gain and solver time."""
from __future__ import annotations

import copy
import functools
import json
import math
import random
import time
from typing import Any

from envelope import envelope
from paths import SCENARIO_PATH
from solvers.baselines import equal_split_crafting, greedy_assignment, nearest_neighbour
from solvers.hungarian import solve_assignment
from solvers.pipeline import run_pipeline
from solvers.tsp import solve_tsp


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _random_map(seed: int, n_nodes: int) -> dict[str, Any]:
    """Generate a seeded random map with `n_nodes` nodes (node 0 = depot).

    Returns a dict with:
      - "labels": list of node label strings
      - "matrix": symmetric distance matrix (rounded Euclidean, same rule as geometry.time_matrix)
      - "nodes": {label: [x, y]} coordinate dict
    """
    rng = random.Random(seed)
    labels = ["Base"] + [f"N{i}" for i in range(1, n_nodes)]
    coords = {label: [rng.uniform(0, 30), rng.uniform(0, 30)] for label in labels}

    n = len(labels)
    matrix = [[0.0] * n for _ in range(n)]
    for i in range(n):
        xi, yi = coords[labels[i]]
        for j in range(n):
            if i != j:
                xj, yj = coords[labels[j]]
                matrix[i][j] = round(math.sqrt((xi - xj) ** 2 + (yi - yj) ** 2))

    return {"labels": labels, "matrix": matrix, "nodes": coords}


def _opt_tour_cost(matrix: list[list[float]], labels: list[str]) -> float:
    """Compute the optimal TSP tour cost using the Hungarian + branch-and-bound solver."""
    result = solve_tsp(matrix, labels)
    if result["status"] == "optimal":
        return result["answer"]["cost"]
    raise RuntimeError(
        f"solve_tsp failed with status {result['status']!r}: {result.get('answer', {}).get('message')}"
    )


def _opt_assignment_cost(scores: list[list[float]]) -> float:
    """Compute the optimal assignment score using the Hungarian solver (Part 3)."""
    result = solve_assignment(scores, maximize=True)
    if result["status"] == "optimal":
        return result["answer"]["total"]
    raise RuntimeError(f"solve_assignment failed with status {result['status']!r}")


def _random_scores(rng: random.Random, n: int, m: int) -> list[list[float]]:
    """Generate an n x m random integer score matrix in range [30, 100]."""
    return [[rng.randint(30, 100) for _ in range(m)] for _ in range(n)]


@functools.lru_cache(maxsize=1)
def _load_scenario() -> dict[str, Any]:
    """Load the demo scenario JSON file from disk."""
    with open(SCENARIO_PATH, encoding="utf-8") as f:
        return json.load(f)


def _compute_demo_modules(scenario: dict[str, Any]) -> list[dict[str, Any]]:
    """Compute the 4-row canonical summary table for the demo scenario from active solvers."""
    # 1. Pipeline optimal & naive (nearest_neighbour)
    opt_pipe = run_pipeline(scenario, route="optimal")
    naive_pipe = run_pipeline(scenario, route="nearest_neighbour")

    # Route: naive tour time vs optimal tour time (lower is better)
    route_naive = naive_pipe["answer"]["tour_time"]
    route_opt = opt_pipe["answer"]["tour_time"]
    route_gain = round(((route_naive - route_opt) / route_naive) * 100, 2) if route_naive else 0.0

    # 2. Assignment: greedy vs Hungarian optimal (higher is better)
    scores = scenario["weapon_boss_scores"]
    _pairs, assign_naive = greedy_assignment(scores)
    assign_opt = solve_assignment(scores, maximize=True)["answer"]["total"]
    assign_gain = round(((assign_opt - assign_naive) / assign_naive) * 100, 2) if assign_naive else 0.0

    # 3. Crafting: equal-split heuristic at remaining craft time vs optimal crafting (higher is better)
    opt_craft_time = opt_pipe["answer"]["craft_time"]
    opt_craft = opt_pipe["answer"]["crafting"]
    craft_plan = equal_split_crafting(scenario, opt_craft_time)
    craft_naive = craft_plan[1] if craft_plan is not None else None
    craft_gain = (
        round(((opt_craft - craft_naive) / craft_naive) * 100, 2)
        if (craft_naive is not None and craft_naive > 0)
        else None
    )

    # 4. Whole pipeline: naive route leaves infeasible crafting vs optimal total (higher is better)
    pipe_naive = naive_pipe["answer"]["total"]
    pipe_opt = opt_pipe["answer"]["total"]
    pipe_gain = (
        round(((pipe_opt - pipe_naive) / pipe_naive) * 100, 2)
        if (pipe_naive is not None and pipe_naive > 0)
        else None
    )
    naive_craft_time = naive_pipe["answer"]["craft_time"]

    return [
        {
            "module": "Route",
            "naive": route_naive,
            "optimized": route_opt,
            "unit": "minutes",
            "gain_pct": route_gain,
            "direction": "lower_is_better",
        },
        {
            "module": "Assignment",
            "naive": assign_naive,
            "optimized": assign_opt,
            "unit": "score",
            "gain_pct": assign_gain,
            "direction": "higher_is_better",
        },
        {
            "module": "Crafting",
            "naive": craft_naive,
            "optimized": opt_craft,
            "unit": "score",
            "gain_pct": craft_gain,
            "direction": "higher_is_better",
            "naive_note": f"Equal-split heuristic at {opt_craft_time} min remaining after optimal tour",
        },
        {
            "module": "Whole pipeline",
            "naive": pipe_naive,
            "optimized": pipe_opt,
            "unit": "score",
            "gain_pct": pipe_gain,
            "direction": "higher_is_better",
            "naive_note": f"Naive route leaves {naive_craft_time} min of crafting: infeasible",
        },
    ]


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

@functools.lru_cache(maxsize=32)
def _run_experiments_cached(n_maps: int = 20, seed: int = 0) -> dict[str, Any]:
    rng = random.Random(seed)
    scenario = _load_scenario()
    modules = _compute_demo_modules(scenario)

    map_results = []
    total_route_gain = 0.0
    total_assign_gain = 0.0
    total_solver_ms = 0.0

    for _ in range(n_maps):
        map_seed = rng.randint(0, 2**31 - 1)
        n_nodes = rng.randint(8, 10)

        map_data = _random_map(map_seed, n_nodes)
        labels = map_data["labels"]
        matrix = map_data["matrix"]

        # --- TSP: nearest neighbour baseline ---
        _nn_tour, nn_cost = nearest_neighbour(matrix, labels, start=labels[0])

        # --- Assignment: generate random 5x5 scores ---
        map_rng = random.Random(map_seed)
        scores = _random_scores(map_rng, 5, 5)
        _greedy_pairs, greedy_total = greedy_assignment(scores)

        # --- Solvers: optimal TSP (branch-and-bound) + Hungarian assignment ---
        t0 = time.perf_counter()
        opt_cost = _opt_tour_cost(matrix, labels)
        opt_assign = _opt_assignment_cost(scores)
        solver_ms = round((time.perf_counter() - t0) * 1000, 3)

        # --- Route gain (reduction in travel time) ---
        route_gain_pct = round(((nn_cost - opt_cost) / nn_cost) * 100, 4) if nn_cost > 0 else 0.0
        total_route_gain += route_gain_pct

        # --- Assignment gain (increase in combat score) ---
        assign_gain_pct = round(((opt_assign - greedy_total) / greedy_total) * 100, 4) if greedy_total > 0 else 0.0
        total_assign_gain += assign_gain_pct

        total_solver_ms += solver_ms

        map_entry: dict[str, Any] = {
            "seed": map_seed,
            "n_nodes": n_nodes,
            "nn_cost": nn_cost,
            "opt_cost": opt_cost,
            "route_gain_pct": route_gain_pct,
            "greedy_assign": greedy_total,
            "opt_assign": opt_assign,
            "assign_gain_pct": assign_gain_pct,
            "solver_ms": solver_ms,
        }
        map_results.append(map_entry)

    avg_route_gain = round(total_route_gain / n_maps, 4)
    avg_assign_gain = round(total_assign_gain / n_maps, 4)
    avg_solver_ms = round(total_solver_ms / n_maps, 3)

    random_maps = {
        "n": n_maps,
        "avg_route_gain_pct": avg_route_gain,
        "avg_assign_gain_pct": avg_assign_gain,
        "avg_solver_ms": avg_solver_ms,
        "maps": map_results,
    }

    return envelope("optimal", {"modules": modules, "random_maps": random_maps})


def run_experiments(n_maps: int = 20, seed: int = 0) -> dict[str, Any]:
    """Run experiments on `n_maps` seeded random maps and return an envelope.

    For each map:
      - n_nodes is drawn uniformly from [8, 10]
      - Nearest-neighbour vs optimal TSP tour cost (gain % = reduction in travel time)
      - Greedy vs optimal assignment (gain % = increase in score)
      - Solver timing (TSP branch-and-bound + Hungarian assignment, ms)

    Solution costs, tours, scores, and percentage gains are fully deterministic and
    reproducible for the same seed. Timing fields (`solver_ms` and `avg_solver_ms`) measure
    actual CPU execution time and naturally vary between runs and hardware.

    Answer shape (docs/api-contract.md):
      modules: canonical 4-row summary computed from the demo scenario and solvers
      random_maps: {n, avg_route_gain_pct, avg_assign_gain_pct, avg_solver_ms, maps: [...]}
    """
    if not isinstance(n_maps, int) or isinstance(n_maps, bool) or n_maps < 1:
        raise ValueError(f"n_maps must be an integer >= 1, got {n_maps!r}")

    return copy.deepcopy(_run_experiments_cached(n_maps, seed))


run_experiments.cache_clear = _run_experiments_cached.cache_clear

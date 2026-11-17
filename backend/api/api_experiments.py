"""Part 10: /api/experiments (naive vs optimized, plus the 20-map summary) and
/api/experiments/map (rebuild one benchmark map as a full scenario)."""
from fastapi import APIRouter, HTTPException, Query

from solvers.experiments import (
    BENCHMARK_MAX_NODES,
    BENCHMARK_MAX_SEED,
    BENCHMARK_MIN_NODES,
    benchmark_map_scenario,
    run_experiments,
)

router = APIRouter()


@router.get("/experiments")
def get_experiments() -> dict:
    return run_experiments(n_maps=20, seed=0)


@router.get("/experiments/map")
def get_experiment_map(
    seed: int = Query(..., ge=0, le=BENCHMARK_MAX_SEED),
    n_nodes: int = Query(..., ge=BENCHMARK_MIN_NODES, le=BENCHMARK_MAX_NODES),
) -> dict:
    try:
        return benchmark_map_scenario(seed, n_nodes)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

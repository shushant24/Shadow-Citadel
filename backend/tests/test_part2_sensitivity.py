import pytest
from fastapi import HTTPException

from api.api_craft import CraftRequest, post_craft
from conftest import CONSTRAINT_NAMES, check_contract, crafting_lp
from solvers.bigm import solve_bigm
from solvers.sensitivity import (
    binding_constraints,
    bottleneck_text,
    rhs_ranging,
    shadow_prices,
)
from solvers.twophase import solve_twophase


def _final_step_bigm(scenario, minutes):
    result = solve_bigm(*crafting_lp(scenario, minutes), maximize=True)
    return result["steps"][-1]


def _final_step_twophase(scenario, minutes):
    result = solve_twophase(*crafting_lp(scenario, minutes), maximize=True)
    return result["steps"][-1]


def _current_rhs(scenario, minutes):
    """Build the actual RHS dict matching what the solver saw."""
    lim = scenario["limits"]
    return {
        "time": float(minutes),
        "weight": float(lim["weight"]),
        "stamina": float(lim["stamina"]),
        "survival": float(lim["survival_min"]),
        "slots": float(lim["slots"]),
    }


def test_shadow_prices_for_50_minutes(scenario):
    prices = shadow_prices(_final_step_bigm(scenario, 50), CONSTRAINT_NAMES)
    assert prices["time"] == pytest.approx(0.75)
    assert prices["weight"] == pytest.approx(0.50)
    assert prices["slots"] == pytest.approx(4.25)
    assert prices.get("stamina", 0) == pytest.approx(0)
    assert prices.get("survival", 0) == pytest.approx(0)


def test_42_minutes_scores_111(scenario):
    result = solve_bigm(*crafting_lp(scenario, 42), maximize=True)
    assert result["answer"]["z"] == pytest.approx(111)
    assert result["answer"]["x"] == pytest.approx([13, 0, 0, 1])


def test_twophase_parity_all_prices_and_ranging_at_50_and_60_min(scenario):
    """Two-Phase and Big-M have exact parity across all 5 shadow prices and RHS ranges."""
    for minutes in (50, 60):
        rhs = _current_rhs(scenario, minutes)
        step_bm = _final_step_bigm(scenario, minutes)
        step_tp = _final_step_twophase(scenario, minutes)

        sp_bm = shadow_prices(step_bm, CONSTRAINT_NAMES)
        sp_tp = shadow_prices(step_tp, CONSTRAINT_NAMES)
        assert sp_bm == sp_tp

        rng_bm = rhs_ranging(step_bm, CONSTRAINT_NAMES, rhs)
        rng_tp = rhs_ranging(step_tp, CONSTRAINT_NAMES, rhs)
        assert rng_bm == rng_tp


def test_rhs_ranging_exact_bounds_and_branches(scenario):
    """rhs_ranging returns exact bounds; unbounded directions return None instead of inf."""
    step = _final_step_bigm(scenario, 50)
    rhs = _current_rhs(scenario, 50)
    ranges = rhs_ranging(step, CONSTRAINT_NAMES, rhs)

    # Binding constraints with finite lower and upper limits
    assert ranges["time"] == (42.0, 54.67)
    assert ranges["weight"] == (26.0, 46.0)
    assert ranges["slots"] == (12.73, 16.67)

    # Non-binding slack branch (stamina has surplus slack in basis: upper bound is None)
    assert ranges["stamina"] == (57.0, None)

    # Non-binding surplus branch (survival has surplus in basis: lower bound is None)
    assert ranges["survival"] == (None, 44.0)

    # Exact bounds for 42-minute case
    step_42 = _final_step_bigm(scenario, 42)
    ranges_42 = rhs_ranging(step_42, CONSTRAINT_NAMES, _current_rhs(scenario, 42))
    assert ranges_42["time"] == (40.0, 42.0)
    assert ranges_42["slots"] == (14.0, None)


def test_rhs_ranging_raises_key_error_on_missing_key(scenario):
    """rhs_ranging must raise KeyError when current_rhs lacks a required constraint name."""
    step = _final_step_bigm(scenario, 50)
    # scenario["limits"] lacks "time" and uses "survival_min" instead of "survival"
    with pytest.raises(KeyError, match="missing constraint name 'time'"):
        rhs_ranging(step, CONSTRAINT_NAMES, scenario["limits"])


def test_bottleneck_text_branches():
    """bottleneck_text correctly formats time, other constraints, and no-active-constraint states."""
    # 1. Time branch
    t1 = bottleneck_text({"time": 0.75, "weight": 0.5, "slots": 4.25, "stamina": 0.0, "survival": 0.0})
    assert t1 == "Crafting time is the bottleneck: each extra minute adds 0.75 score."

    # 2. Other constraint branch (time is 0, slots is highest active)
    t2 = bottleneck_text({"time": 0.0, "weight": 0.75, "slots": 7.0, "stamina": 0.0, "survival": -0.25})
    assert t2 == "Slots is the bottleneck: each extra unit adds 7 score."

    # 3. No active constraints branch (all <= 0)
    t3 = bottleneck_text({"time": 0.0, "weight": 0.0, "slots": 0.0, "stamina": 0.0, "survival": -0.25})
    assert t3 == "No constraints are actively bottlenecking the crafting score."


def test_shadow_prices_preserve_negative_for_ge_constraints(scenario):
    """For time_limit >= ~60, survival binds with a negative shadow price in both solvers."""
    for solver_func in (_final_step_bigm, _final_step_twophase):
        step = solver_func(scenario, 60)
        prices = shadow_prices(step, CONSTRAINT_NAMES)
        assert prices["survival"] == pytest.approx(-0.25)


def test_craft_endpoint_non_binding_time_includes_required_keys(scenario):
    """When time is not binding, shadow_prices still includes time=0.0 in both solvers."""
    for method in ("bigm", "twophase"):
        req = CraftRequest(time_limit=60.0, recipes=scenario["recipes"], limits=scenario["limits"], method=method)
        res = post_craft(req)
        check_contract("craft", res)
        assert res["status"] == "optimal"
        assert res["answer"]["shadow_prices"]["time"] == 0.0
        assert "time" not in res["answer"]["binding"]
        assert "slots" in res["answer"]["shadow_prices"]
        assert "weight" in res["answer"]["shadow_prices"]
        assert "survival" in res["answer"]["binding"]


def test_binding_derived_from_basis_membership(scenario):
    """Binding constraints are derived from basis membership, including tight constraints with price 0."""
    step_50 = _final_step_bigm(scenario, 50)
    assert binding_constraints(step_50, CONSTRAINT_NAMES) == ["time", "weight", "slots"]

    step_60 = _final_step_bigm(scenario, 60)
    assert binding_constraints(step_60, CONSTRAINT_NAMES) == ["weight", "survival", "slots"]


def test_craft_endpoint_validation_errors(scenario):
    """CraftRequest validates input dimensions, keys, and values, preventing 500s."""
    # 1. Missing recipe key even when extra keys are present
    with pytest.raises(ValueError, match="recipes missing required keys"):
        CraftRequest(time_limit=50.0, recipes={"score": [1.0], "extra": [1.0]}, limits=scenario["limits"])

    # 2. Missing limit key even when extra keys are present
    with pytest.raises(ValueError, match="limits missing required keys"):
        CraftRequest(time_limit=50.0, recipes=scenario["recipes"], limits={"weight": 40.0, "extra": 10.0})

    # 3. Ragged lists in recipes
    ragged = dict(scenario["recipes"])
    ragged["score"] = [8.0, 6.0]  # length 2 instead of 4
    with pytest.raises(ValueError, match="different lengths"):
        CraftRequest(time_limit=50.0, recipes=ragged, limits=scenario["limits"])

    # 4. Non-finite time_limit (NaN or inf)
    with pytest.raises(ValueError, match="finite number"):
        CraftRequest(time_limit=float("nan"), recipes=scenario["recipes"], limits=scenario["limits"])
    with pytest.raises(ValueError, match="finite number"):
        CraftRequest(time_limit=float("inf"), recipes=scenario["recipes"], limits=scenario["limits"])

    # 5. Negative time_limit
    with pytest.raises(ValueError, match="cannot be negative"):
        CraftRequest(time_limit=-5.0, recipes=scenario["recipes"], limits=scenario["limits"])

    # 6. Upper bound on recipes (> 50)
    huge_recipes = {k: [1.0] * 51 for k in scenario["recipes"]}
    with pytest.raises(ValueError, match="cannot contain more than 50 items"):
        CraftRequest(time_limit=50.0, recipes=huge_recipes, limits=scenario["limits"])

    # 7. Empty lists
    empty_recipes = {k: [] for k in scenario["recipes"]}
    with pytest.raises(ValueError, match="non-empty"):
        CraftRequest(time_limit=50.0, recipes=empty_recipes, limits=scenario["limits"])


def test_craft_endpoint_zero_time_limit(scenario):
    """time_limit of 0 is valid input but results in an infeasible plan."""
    req = CraftRequest(time_limit=0.0, recipes=scenario["recipes"], limits=scenario["limits"], method="bigm")
    res = post_craft(req)
    check_contract("craft", res)
    assert res["status"] == "infeasible"


def test_craft_endpoint_maps_solver_value_error_to_http_422(scenario):
    """post_craft translates solver ValueErrors into an HTTP 422 HTTPException."""
    # Bypassing pydantic validation with model_construct to deliver bad values to solver
    bad_req = CraftRequest.model_construct(
        time_limit=50.0,
        recipes={"score": [float("nan")], "time": [1.0], "weight": [1.0], "stamina": [1.0], "survival": [1.0]},
        limits=scenario["limits"],
        method="bigm",
    )
    with pytest.raises(HTTPException) as exc_info:
        post_craft(bad_req)
    assert exc_info.value.status_code == 422
    assert "not a finite number" in exc_info.value.detail

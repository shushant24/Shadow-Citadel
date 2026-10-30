import pytest
from api.api_craft import CraftRequest, post_craft
from conftest import CONSTRAINT_NAMES, check_contract, crafting_lp
from solvers.bigm import solve_bigm
from solvers.sensitivity import bottleneck_text, rhs_ranging, shadow_prices


def _final_step(scenario, minutes):
    result = solve_bigm(*crafting_lp(scenario, minutes), maximize=True)
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
    prices = shadow_prices(_final_step(scenario, 50), CONSTRAINT_NAMES)
    assert prices["time"] == pytest.approx(0.75)
    assert prices["weight"] == pytest.approx(0.50)
    assert prices["slots"] == pytest.approx(4.25)
    assert prices.get("stamina", 0) == pytest.approx(0)
    assert prices.get("survival", 0) == pytest.approx(0)


def test_42_minutes_scores_111(scenario):
    result = solve_bigm(*crafting_lp(scenario, 42), maximize=True)
    assert result["answer"]["z"] == pytest.approx(111)
    assert result["answer"]["x"] == pytest.approx([13, 0, 0, 1])


def test_rhs_ranging_covers_the_demo_rhs(scenario):
    ranges = rhs_ranging(_final_step(scenario, 50), CONSTRAINT_NAMES, _current_rhs(scenario, 50))
    low, high = ranges["time"]
    assert low <= 50 <= high


def test_rhs_ranging_uses_actual_rhs(scenario):
    """Ranging for 42-minute case should be anchored at 42, not the demo 50."""
    ranges = rhs_ranging(_final_step(scenario, 42), CONSTRAINT_NAMES, _current_rhs(scenario, 42))
    low, high = ranges["time"]
    assert low <= 42 <= high
    # The old default would have returned (48, 50); verify it doesn't
    assert high <= 50


def test_bottleneck_text_names_craft_time():
    text = bottleneck_text({"time": 0.75, "weight": 0.5, "slots": 4.25, "stamina": 0, "survival": 0})
    assert "time" in text.lower()


def test_shadow_prices_preserve_negative_for_ge_constraints(scenario):
    """For time_limit >= ~60, survival binds with a negative shadow price. It must be kept."""
    prices = shadow_prices(_final_step(scenario, 60), CONSTRAINT_NAMES)
    # Survival is a >= constraint; at 60 min, its shadow price is -0.25
    assert prices["survival"] == pytest.approx(-0.25)


def test_craft_endpoint_non_binding_time_includes_required_keys(scenario):
    """When time is not binding, shadow_prices still includes time=0.0 and obeys the contract."""
    req = CraftRequest(time_limit=60.0, recipes=scenario["recipes"], limits=scenario["limits"], method="bigm")
    res = post_craft(req)
    check_contract("craft", res)
    assert res["status"] == "optimal"
    assert res["answer"]["shadow_prices"]["time"] == 0.0
    assert "time" not in res["answer"]["binding"]
    assert "slots" in res["answer"]["shadow_prices"]
    assert "weight" in res["answer"]["shadow_prices"]


def test_craft_endpoint_validation_errors(scenario):
    """CraftRequest validates input dimensions, keys, and values, preventing 500s."""
    # 1. Missing recipe key
    with pytest.raises(ValueError, match="recipes missing required keys"):
        CraftRequest(time_limit=50.0, recipes={"score": [1.0]}, limits=scenario["limits"])

    # 2. Missing limit key
    with pytest.raises(ValueError, match="limits missing required keys"):
        CraftRequest(time_limit=50.0, recipes=scenario["recipes"], limits={"weight": 40.0})

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

    # 5. Empty lists
    empty_recipes = {k: [] for k in scenario["recipes"]}
    with pytest.raises(ValueError, match="non-empty"):
        CraftRequest(time_limit=50.0, recipes=empty_recipes, limits=scenario["limits"])


def test_craft_endpoint_solver_parity_and_infeasible(scenario):
    """Both Big-M and Two-Phase produce matching optimal/infeasible results via the API."""
    req_bm = CraftRequest(time_limit=50.0, recipes=scenario["recipes"], limits=scenario["limits"], method="bigm")
    res_bm = post_craft(req_bm)
    check_contract("craft", res_bm)

    req_tp = CraftRequest(time_limit=50.0, recipes=scenario["recipes"], limits=scenario["limits"], method="twophase")
    res_tp = post_craft(req_tp)
    check_contract("craft", res_tp)

    assert res_bm["answer"]["z"] == pytest.approx(res_tp["answer"]["z"])
    assert res_bm["answer"]["shadow_prices"]["time"] == pytest.approx(res_tp["answer"]["shadow_prices"]["time"])

    # 40-minute infeasible limit
    req_inf = CraftRequest(time_limit=40.0, recipes=scenario["recipes"], limits=scenario["limits"], method="bigm")
    res_inf = post_craft(req_inf)
    check_contract("craft", res_inf)
    assert res_inf["status"] == "infeasible"
    assert "message" in res_inf["answer"]


"""Unit tests for /api/craft endpoint in Task 2."""
import pytest
from api.api_craft import CraftRequest, post_craft
from contract import check


def test_api_craft_50_min_optimal(scenario):
    req = CraftRequest(
        time_limit=50.0,
        recipes=scenario["recipes"],
        limits=scenario["limits"],
        method="bigm",
    )
    res = post_craft(req)

    assert res["status"] == "optimal"
    ans = res["answer"]
    assert ans["z"] == 117
    assert ans["x"] == [7, 0, 4, 3]

    sp = ans["shadow_prices"]
    assert pytest.approx(sp["time"], 0.01) == 0.75
    assert pytest.approx(sp["weight"], 0.01) == 0.50
    assert pytest.approx(sp["slots"], 0.01) == 4.25

    assert "Crafting time is the bottleneck" in ans["bottleneck"]
    check("craft", res)


def test_api_craft_40_min_infeasible(scenario):
    req = CraftRequest(
        time_limit=40.0,
        recipes=scenario["recipes"],
        limits=scenario["limits"],
        method="bigm",
    )
    res = post_craft(req)

    assert res["status"] == "infeasible"
    assert "message" in res["answer"]
    check("craft", res)


def test_api_craft_twophase(scenario):
    req = CraftRequest(
        time_limit=50.0,
        recipes=scenario["recipes"],
        limits=scenario["limits"],
        method="twophase",
    )
    res = post_craft(req)

    assert res["status"] == "optimal"
    assert res["answer"]["z"] == 117
    assert pytest.approx(res["answer"]["shadow_prices"]["time"], 0.01) == 0.75
    check("craft", res)

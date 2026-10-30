"""Part 10: end-to-end check of every endpoint against the Section 4 values and the shared fixtures."""
import pytest
from conftest import check_contract, pending

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402

client = TestClient(app)


def call(method, path, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code == 501:  # endpoint exists but the part is not built yet
        raise NotImplementedError(response.json()["detail"])
    assert response.status_code == 200, response.text
    return response.json()


def test_health_and_scenario_endpoints(scenario):
    assert client.get("/api/health").status_code == 200
    assert call("GET", "/api/scenario") == scenario


def test_route_endpoint_rejects_an_empty_body():
    assert client.post("/api/route", json={}).status_code == 422


@pending
def test_hull_endpoint_matches_fixture(scenario, fixture):
    body = {"points": {**scenario["nodes"], **scenario["loot"]}}
    result = call("POST", "/api/hull", json=body)
    check_contract("hull", result)
    assert result["answer"]["vertices"] == fixture("hull")["answer"]["vertices"]


@pending
def test_route_endpoint_matches_fixture(time_matrix, fixture):
    result = call("POST", "/api/route", json=time_matrix)
    check_contract("route", result)
    assert result["answer"]["cost"] == fixture("route")["answer"]["cost"]
    assert result["answer"]["nearest_neighbour"]["cost"] == 80


@pending
def test_route_endpoint_accepts_points_instead_of_a_matrix(scenario):
    result = call("POST", "/api/route", json={"points": scenario["nodes"]})
    check_contract("route", result)
    assert result["answer"]["cost"] == 70



def test_assign_endpoint_matches_fixture(scenario, fixture):
    result = call("POST", "/api/assign", json={"scores": scenario["weapon_boss_scores"], "maximize": True})
    check_contract("assign", result)
    assert result["answer"]["total"] == fixture("assign")["answer"]["total"]



def test_assign_endpoint_handles_an_unbalanced_matrix(scenario):
    scores = [row[:4] for row in scenario["weapon_boss_scores"]]
    result = call("POST", "/api/assign", json={"scores": scores, "maximize": True})
    check_contract("assign", result)
    assert result["answer"]["total"] == 385


def test_craft_endpoint_matches_fixture(scenario, fixture):
    body = {"time_limit": 50, "recipes": scenario["recipes"], "limits": scenario["limits"], "method": "bigm"}
    result = call("POST", "/api/craft", json=body)
    check_contract("craft", result)
    assert result["answer"]["z"] == fixture("craft")["answer"]["z"]
    assert result["answer"]["shadow_prices"]["time"] == pytest.approx(0.75)
    assert result["answer"]["shadow_prices"]["slots"] == pytest.approx(4.25)


def test_craft_endpoint_both_methods_and_the_special_cases(scenario):
    base = {"recipes": scenario["recipes"], "limits": scenario["limits"]}
    for method in ("bigm", "twophase"):
        r42 = call("POST", "/api/craft", json={**base, "time_limit": 42, "method": method})
        check_contract("craft", r42)
        assert r42["answer"]["z"] == pytest.approx(111)
        r40 = call("POST", "/api/craft", json={**base, "time_limit": 40, "method": method})
        check_contract("craft", r40)
        assert r40["status"] == "infeasible" and r40["answer"]["message"]


def test_craft_endpoint_rejects_invalid_inputs(scenario):
    assert client.post("/api/craft", json={}).status_code == 422
    assert client.post("/api/craft", json={"time_limit": -5.0, "recipes": scenario["recipes"], "limits": scenario["limits"]}).status_code == 422
    assert client.post("/api/craft", json={"time_limit": 50.0, "recipes": {"score": [1.0]}, "limits": scenario["limits"]}).status_code == 422
    huge_recipes = {k: [1.0] * 55 for k in scenario["recipes"]}
    assert client.post("/api/craft", json={"time_limit": 50.0, "recipes": huge_recipes, "limits": scenario["limits"]}).status_code == 422


@pending
def test_pipeline_endpoint_totals_562(scenario):
    result = call("POST", "/api/pipeline", json=scenario)
    check_contract("pipeline", result)
    assert result["answer"]["total"] == 562


@pending
def test_pipeline_endpoint_with_the_naive_route_is_infeasible(scenario):
    result = call("POST", "/api/pipeline?route=nearest_neighbour", json=scenario)
    check_contract("pipeline", result)
    assert result["status"] == "infeasible" and result["answer"]["craft_time"] == 40


@pending
def test_experiments_endpoint_responds():
    check_contract("experiments", call("GET", "/api/experiments"))

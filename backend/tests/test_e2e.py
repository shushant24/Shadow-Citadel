"""Part 10: end-to-end check of every endpoint against the Section 4 values and the shared fixtures."""
import pytest
from conftest import check_envelope, pending

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


@pending
def test_hull_endpoint_matches_fixture(scenario, fixture):
    body = {"points": {**scenario["nodes"], **scenario["loot"]}}
    result = call("POST", "/api/hull", json=body)
    check_envelope(result)
    assert result["answer"]["vertices"] == fixture("hull")["answer"]["vertices"]


@pending
def test_route_endpoint_matches_fixture(time_matrix, fixture):
    result = call("POST", "/api/route", json=time_matrix)
    assert result["answer"]["cost"] == fixture("route")["answer"]["cost"]


@pending
def test_assign_endpoint_matches_fixture(scenario, fixture):
    result = call("POST", "/api/assign", json={"scores": scenario["weapon_boss_scores"], "maximize": True})
    assert result["answer"]["total"] == fixture("assign")["answer"]["total"]


@pending
def test_craft_endpoint_matches_fixture(scenario, fixture):
    body = {"time_limit": 50, "recipes": scenario["recipes"], "limits": scenario["limits"], "method": "bigm"}
    result = call("POST", "/api/craft", json=body)
    assert result["answer"]["z"] == fixture("craft")["answer"]["z"]
    assert result["answer"]["shadow_prices"] == pytest.approx(fixture("craft")["answer"]["shadow_prices"])


@pending
def test_pipeline_endpoint_totals_562(scenario):
    assert call("POST", "/api/pipeline", json=scenario)["answer"]["total"] == 562


@pending
def test_experiments_endpoint_responds():
    check_envelope(call("GET", "/api/experiments"))

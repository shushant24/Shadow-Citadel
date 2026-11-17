"""GET /api/experiments/map: rebuild a benchmark map from its seed and check that the
public solver endpoints reproduce the 20-map table row by row."""
import pytest
from conftest import check_contract

pytest.importorskip("fastapi")
pytest.importorskip("httpx")
from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from solvers.baselines import greedy_assignment  # noqa: E402
from solvers.experiments import _random_map, build_benchmark_map, run_experiments  # noqa: E402
from solvers.geometry import time_matrix  # noqa: E402

client = TestClient(app)

ROWS = run_experiments(n_maps=20, seed=0)["answer"]["random_maps"]["maps"]
ROW_IDS = [f"row{i}-seed{r['seed']}" for i, r in enumerate(ROWS, start=1)]


def get_map(seed, n_nodes):
    response = client.get("/api/experiments/map", params={"seed": seed, "n_nodes": n_nodes})
    assert response.status_code == 200, response.text
    return response.json()


def test_benchmark_rows_unchanged_by_refactor(fixture):
    """The shared generator must not change any number in the 20-row table (timing aside)."""
    golden = fixture("experiments")["answer"]["random_maps"]["maps"]
    strip = lambda rows: [{k: v for k, v in r.items() if k != "solver_ms"} for r in rows]  # noqa: E731
    assert strip(ROWS) == strip(golden)


@pytest.mark.parametrize("index,row", list(enumerate(ROWS, start=1)), ids=ROW_IDS)
def test_live_solvers_reproduce_benchmark_row(index, row, scenario):
    sc = get_map(row["seed"], row["n_nodes"])

    # Scenario shape: same keys as data/scenario.json, plus benchmark metadata.
    assert set(scenario) <= set(sc)
    assert list(sc["nodes"])[0] == "Base"
    assert list(sc["nodes"]) == ["Base"] + [f"N{i}" for i in range(1, row["n_nodes"])]
    assert sc["loot"] == {}
    assert sc["total_time"] == scenario["total_time"]
    assert sc["recipes"] == scenario["recipes"]
    assert sc["limits"] == scenario["limits"]
    assert len(sc["weapon_boss_scores"]) == 5 and all(len(r) == 5 for r in sc["weapon_boss_scores"])

    bench = sc["benchmark"]
    assert bench["seed"] == row["seed"] and bench["n_nodes"] == row["n_nodes"]
    assert bench["index"] == index
    expected = {k: row[k] for k in ("nn_cost", "opt_cost", "greedy_assign", "opt_assign")}
    assert bench["expected"] == expected
    assert bench["recomputed"] == expected

    # Route endpoint on the returned coordinates (the Map tab's request).
    route = client.post("/api/route", json={"points": sc["nodes"]}).json()
    check_contract("route", route)
    assert route["answer"]["cost"] == row["opt_cost"]
    assert route["answer"]["nearest_neighbour"]["cost"] == row["nn_cost"]

    # Assignment endpoint on the returned scores (the Matchups tab's request).
    assign = client.post("/api/assign", json={"scores": sc["weapon_boss_scores"], "maximize": True}).json()
    check_contract("assign", assign)
    assert assign["answer"]["total"] == row["opt_assign"]
    assert greedy_assignment(sc["weapon_boss_scores"])[1] == row["greedy_assign"]

    # Pipeline: chained totals, infeasible when the tour leaves less than slots x fastest recipe.
    pipe = client.post("/api/pipeline?route=optimal", json=sc).json()
    check_contract("pipeline", pipe)
    craft_time = sc["total_time"] - row["opt_cost"]
    assert pipe["answer"]["tour_time"] == row["opt_cost"]
    assert pipe["answer"]["craft_time"] == craft_time
    assert pipe["answer"]["combat"] == row["opt_assign"]
    min_needed = sc["limits"]["slots"] * min(sc["recipes"]["time"])
    if craft_time < min_needed:
        assert pipe["status"] == "infeasible" and pipe["answer"]["total"] is None
    else:
        assert pipe["status"] == "optimal"
        assert pipe["answer"]["total"] == row["opt_assign"] + pipe["answer"]["crafting"]


@pytest.mark.parametrize("row", ROWS, ids=ROW_IDS)
def test_points_route_uses_same_rounding_as_random_map(row):
    """/api/route with points builds geometry.time_matrix; it must equal _random_map's matrix."""
    generated = _random_map(row["seed"], row["n_nodes"])
    labels = generated["labels"]
    assert time_matrix(generated["nodes"], labels) == generated["matrix"]
    assert build_benchmark_map(row["seed"], row["n_nodes"])["matrix"] == generated["matrix"]


def test_spec_examples():
    first = get_map(1654615998, 9)
    assert first["benchmark"]["index"] == 1
    assert first["benchmark"]["expected"]["opt_cost"] == 70
    assert first["benchmark"]["expected"]["nn_cost"] == 72

    twelfth = get_map(316721330, 10)
    assert twelfth["benchmark"]["index"] == 12
    pipe = client.post("/api/pipeline", json=twelfth).json()
    assert pipe["status"] == "infeasible"
    assert pipe["answer"]["tour_time"] == 107 and pipe["answer"]["craft_time"] == 13
    assert pipe["answer"]["message"]


def test_non_benchmark_seed_has_no_index_or_expected():
    sc = get_map(12345, 8)
    assert sc["benchmark"]["index"] is None
    assert sc["benchmark"]["expected"] is None
    assert set(sc["benchmark"]["recomputed"]) == {"nn_cost", "opt_cost", "greedy_assign", "opt_assign"}
    # benchmark seed with a different node count is a different map
    assert get_map(ROWS[0]["seed"], 10 if ROWS[0]["n_nodes"] != 10 else 8)["benchmark"]["index"] is None


@pytest.mark.parametrize("params", [
    {},
    {"seed": 1},
    {"n_nodes": 9},
    {"seed": -1, "n_nodes": 9},
    {"seed": 2**31, "n_nodes": 9},
    {"seed": "abc", "n_nodes": 9},
    {"seed": 1, "n_nodes": 7},
    {"seed": 1, "n_nodes": 11},
    {"seed": 1, "n_nodes": 9.5},
])
def test_bad_inputs_return_422(params):
    assert client.get("/api/experiments/map", params=params).status_code == 422

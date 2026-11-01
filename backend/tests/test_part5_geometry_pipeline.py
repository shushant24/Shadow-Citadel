import pytest
from conftest import check_contract, check_envelope
from solvers.geometry import random_map, time_matrix as build_time_matrix
from solvers.hull import convex_hull
from solvers.pipeline import run_pipeline

EXPECTED_HULL = ["Base", "L4", "C2", "L1", "L2", "C6", "C5"]


def all_points(scenario):
    return {**scenario["nodes"], **scenario["loot"]}


def test_hull_has_7_vertices_in_order(scenario):
    result = convex_hull(all_points(scenario))
    check_envelope(result)
    assert result["answer"]["vertices"] == EXPECTED_HULL
    assert sorted(result["answer"]["interior"]) == ["C1", "C3", "C4", "C7", "L3"]


def test_hull_steps_end_on_the_final_stack(scenario):
    steps = convex_hull(all_points(scenario))["steps"]
    assert {s["action"] for s in steps} <= {"push", "pop", "skip"}
    assert steps[-1]["stack"] == EXPECTED_HULL


def test_hull_of_a_triangle_with_an_interior_point():
    result = convex_hull({"A": (0, 0), "B": (4, 0), "C": (0, 4), "D": (1, 1)})
    assert sorted(result["answer"]["vertices"]) == ["A", "B", "C"]
    assert result["answer"]["interior"] == ["D"]


def test_time_matrix_equals_section_3_2(scenario, time_matrix):
    labels = time_matrix["labels"]
    assert build_time_matrix(scenario["nodes"], labels) == time_matrix["matrix"]


def test_random_map_is_seeded_and_sized():
    assert random_map(seed=3, n_nodes=9) == random_map(seed=3, n_nodes=9)
    assert random_map(seed=3, n_nodes=9) != random_map(seed=4, n_nodes=9)
    res = random_map(seed=3, n_nodes=9)
    assert len(res) == 9
    assert "Base" in res and res["Base"] == (0, 0)


def test_time_matrix_is_rounded_euclidean_for_arbitrary_points():
    assert build_time_matrix({"A": (0, 0), "B": (3, 4), "C": (6, 8)}, ["A", "B", "C"]) == \
        [[0, 5, 10], [5, 0, 5], [10, 5, 0]]


def test_hull_edge_cases_and_validation():
    # Empty points
    res_empty = convex_hull({})
    assert res_empty["answer"]["vertices"] == []
    assert res_empty["answer"]["interior"] == []

    # Single point
    res_one = convex_hull({"P": (1, 2)})
    assert res_one["answer"]["vertices"] == ["P"]
    assert res_one["answer"]["interior"] == []

    # Two points
    res_two = convex_hull({"P1": (0, 0), "P2": (2, 2)})
    assert res_two["answer"]["vertices"] == ["P1", "P2"]

    # Collinear points
    res_collinear = convex_hull({"A": (0, 0), "B": (1, 1), "C": (2, 2)})
    assert res_collinear["answer"]["vertices"] == ["A", "C"]
    assert res_collinear["answer"]["interior"] == ["B"]

    # Invalid coordinates
    with pytest.raises(ValueError, match="must be a dictionary"):
        convex_hull([1, 2])

    with pytest.raises(ValueError, match="must have 2 coordinates"):
        convex_hull({"A": [1]})

    with pytest.raises(ValueError, match="must be a finite number"):
        convex_hull({"A": [1, float("nan")]})


def test_geometry_edge_cases_and_validation():
    # Missing node in time_matrix
    with pytest.raises(KeyError, match="Label 'Z' not found"):
        build_time_matrix({"A": (0, 0)}, ["A", "Z"])

    # Invalid n_nodes in random_map
    with pytest.raises(ValueError, match="n_nodes must be an integer >= 1"):
        random_map(seed=0, n_nodes=0)


def test_pipeline_total_is_562(scenario):
    result = run_pipeline(scenario)
    check_contract("pipeline", result)
    assert {k: result["answer"][k] for k in ("tour_time", "craft_time", "combat", "crafting", "total")} == \
        {"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562}
    assert result["answer"]["route_policy"] == "optimal"


def test_pipeline_with_the_naive_route_leaves_crafting_infeasible(scenario):
    result = run_pipeline(scenario, route="nearest_neighbour")
    check_contract("pipeline", result)
    assert result["status"] == "infeasible"
    assert (result["answer"]["tour_time"], result["answer"]["craft_time"]) == (80, 40)
    assert result["answer"]["combat"] == 445 and result["answer"]["total"] is None


def test_pipeline_validation_and_edge_cases(scenario):
    # Invalid route
    with pytest.raises(ValueError, match="route must be one of"):
        run_pipeline(scenario, route="invalid")

    # Non-dict scenario
    with pytest.raises(ValueError, match="scenario must be a dictionary"):
        run_pipeline("not a dict")

    # Missing required key
    bad_sc = {k: v for k, v in scenario.items() if k != "total_time"}
    with pytest.raises(ValueError, match="scenario missing required keys"):
        run_pipeline(bad_sc)

    # Invalid total_time
    with pytest.raises(ValueError, match="total_time must be a finite positive number"):
        run_pipeline({**scenario, "total_time": -10})

    # Too few nodes
    with pytest.raises(ValueError, match="nodes must be a dictionary with at least two points"):
        run_pipeline({**scenario, "nodes": {"Base": [0, 0]}})

    # Craft time negative
    short_sc = {**scenario, "total_time": 30}
    res_short = run_pipeline(short_sc)
    check_contract("pipeline", res_short)
    assert res_short["status"] == "infeasible"
    assert res_short["answer"]["craft_time"] < 0
    assert "crafting plan is infeasible" in res_short["answer"]["message"]

    # Malformed recipe (number instead of list)
    with pytest.raises(ValueError, match="recipes\\['score'\\] must be a non-empty list"):
        run_pipeline({**scenario, "recipes": {**scenario["recipes"], "score": 5}})

    # Malformed limits (list instead of number)
    with pytest.raises(ValueError, match="limits\\['slots'\\] must be a finite number"):
        run_pipeline({**scenario, "limits": {**scenario["limits"], "slots": [14]}})


def test_pipeline_float_tolerance_snapping(scenario, monkeypatch):
    import solvers.pipeline as pipeline_mod
    # Verify _clean_num directly
    assert isinstance(pipeline_mod._clean_num(116.99999999999999), int)
    assert pipeline_mod._clean_num(116.99999999999999) == 117
    assert isinstance(pipeline_mod._clean_num(561.99999999999999), int)
    assert pipeline_mod._clean_num(561.99999999999999) == 562

    # Simulate solver returning slight float imprecision
    orig_bigm = pipeline_mod.solve_bigm
    def mock_bigm(*args, **kwargs):
        res = orig_bigm(*args, **kwargs)
        if res["status"] == "optimal":
            res["answer"]["z"] = 116.99999999999999
        return res
    monkeypatch.setattr(pipeline_mod, "solve_bigm", mock_bigm)

    res = pipeline_mod.run_pipeline(scenario)
    check_contract("pipeline", res)
    assert isinstance(res["answer"]["crafting"], int)
    assert res["answer"]["crafting"] == 117
    assert isinstance(res["answer"]["total"], int)
    assert res["answer"]["total"] == 562

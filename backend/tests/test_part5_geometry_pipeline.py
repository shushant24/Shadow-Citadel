from conftest import check_contract, check_envelope, pending
from solvers.geometry import random_map, time_matrix as build_time_matrix
from solvers.hull import convex_hull
from solvers.pipeline import run_pipeline

EXPECTED_HULL = ["Base", "L4", "C2", "L1", "L2", "C6", "C5"]


def all_points(scenario):
    return {**scenario["nodes"], **scenario["loot"]}


@pending
def test_hull_has_7_vertices_in_order(scenario):
    result = convex_hull(all_points(scenario))
    check_envelope(result)
    assert result["answer"]["vertices"] == EXPECTED_HULL
    assert sorted(result["answer"]["interior"]) == ["C1", "C3", "C4", "C7", "L3"]


@pending
def test_hull_steps_end_on_the_final_stack(scenario):
    steps = convex_hull(all_points(scenario))["steps"]
    assert {s["action"] for s in steps} <= {"push", "pop", "skip"}
    assert steps[-1]["stack"] == EXPECTED_HULL


@pending
def test_hull_of_a_triangle_with_an_interior_point():
    result = convex_hull({"A": (0, 0), "B": (4, 0), "C": (0, 4), "D": (1, 1)})
    assert sorted(result["answer"]["vertices"]) == ["A", "B", "C"]
    assert result["answer"]["interior"] == ["D"]


@pending
def test_time_matrix_equals_section_3_2(scenario, time_matrix):
    labels = time_matrix["labels"]
    assert build_time_matrix(scenario["nodes"], labels) == time_matrix["matrix"]


@pending
def test_random_map_is_seeded_and_sized():
    assert random_map(seed=3, n_nodes=9) == random_map(seed=3, n_nodes=9)
    assert random_map(seed=3, n_nodes=9) != random_map(seed=4, n_nodes=9)


@pending
def test_pipeline_total_is_562(scenario):
    result = run_pipeline(scenario)
    check_contract("pipeline", result)
    assert {k: result["answer"][k] for k in ("tour_time", "craft_time", "combat", "crafting", "total")} == \
        {"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562}
    assert result["answer"]["route_policy"] == "optimal"


@pending
def test_pipeline_with_the_naive_route_leaves_crafting_infeasible(scenario):
    result = run_pipeline(scenario, route="nearest_neighbour")
    check_contract("pipeline", result)
    assert result["status"] == "infeasible"
    assert (result["answer"]["tour_time"], result["answer"]["craft_time"]) == (80, 40)
    assert result["answer"]["combat"] == 445 and result["answer"]["total"] is None


@pending
def test_time_matrix_is_rounded_euclidean_for_arbitrary_points():
    assert build_time_matrix({"A": (0, 0), "B": (3, 4), "C": (6, 8)}, ["A", "B", "C"]) == \
        [[0, 5, 10], [5, 0, 5], [10, 5, 0]]

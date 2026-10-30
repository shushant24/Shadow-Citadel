import itertools
import random

from conftest import check_contract, check_envelope, pending
from solvers.tsp import solve_tsp


def brute_force_tour_cost(matrix):
    n = len(matrix)
    return min(sum(matrix[a][b] for a, b in zip((0,) + p, p + (0,)))
               for p in itertools.permutations(range(1, n)))


@pending
def test_first_pass_is_64_with_two_subtours(time_matrix):
    result = solve_tsp(time_matrix["matrix"], time_matrix["labels"])
    check_envelope(result)
    assert result["answer"]["relaxation_cost"] == 64
    assert sorted(sorted(s) for s in result["answer"]["first_subtours"]) == \
        sorted([sorted(["Base", "C7", "C5"]), sorted(["C1", "C6", "C3", "C4", "C2"])])


@pending
def test_optimal_tour_is_70(time_matrix):
    result = solve_tsp(time_matrix["matrix"], time_matrix["labels"])
    assert result["answer"]["cost"] == 70
    tour = result["answer"]["tour"]
    assert tour[0] == tour[-1] == "Base" and len(set(tour)) == 8


@pending
def test_matches_brute_force_on_seeded_random_matrices():
    rng = random.Random(7)
    for _ in range(5):
        n = 6
        m = [[0 if i == j else rng.randint(3, 30) for j in range(n)] for i in range(n)]
        result = solve_tsp(m, [f"N{i}" for i in range(n)])
        assert result["answer"]["cost"] == brute_force_tour_cost(m)


@pending
def test_trace_follows_the_route_contract(time_matrix):
    result = solve_tsp(time_matrix["matrix"], time_matrix["labels"])
    check_contract("route", result)
    steps = result["steps"]
    assert steps[0]["node"] == 1 and steps[0]["parent"] is None and steps[0]["status"] == "branch"
    assert any(s["status"] == "feasible" and s["cost"] == 70 for s in steps)
    assert any(s["status"] == "pruned" for s in steps)


@pending
def test_answer_includes_the_nearest_neighbour_baseline(time_matrix):
    nn = solve_tsp(time_matrix["matrix"], time_matrix["labels"])["answer"]["nearest_neighbour"]
    assert nn["cost"] == 80 and nn["tour"][0] == nn["tour"][-1] == "Base"


@pending
def test_a_matrix_whose_assignment_is_already_one_tour_needs_no_branching():
    m = [[0, 1, 9], [9, 0, 1], [1, 9, 0]]  # cheapest assignment is the single cycle 0 -> 1 -> 2 -> 0
    result = solve_tsp(m, ["A", "B", "C"])
    assert result["answer"]["cost"] == result["answer"]["relaxation_cost"] == 3
    assert len(result["steps"]) == 1 and result["steps"][0]["status"] == "feasible"

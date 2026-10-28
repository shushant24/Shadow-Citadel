import itertools
import random

from conftest import check_envelope, pending
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

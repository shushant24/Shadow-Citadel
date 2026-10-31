import copy
import pickle
import pytest
from conftest import check_contract, pending
from solvers.baselines import (
    AssignmentResult,
    CraftingPlan,
    TourResult,
    equal_split_crafting,
    greedy_assignment,
    nearest_neighbour,
)
from solvers.experiments import run_experiments


def test_nearest_neighbour_is_80(time_matrix):
    tour, cost = nearest_neighbour(time_matrix["matrix"], time_matrix["labels"], start="Base")
    assert cost == 80
    assert tour == ["Base", "C7", "C5", "C3", "C4", "C1", "C6", "C2", "Base"]


def test_greedy_assignment_is_414(scenario):
    _pairs, total = greedy_assignment(scenario["weapon_boss_scores"])
    assert total == 414


@pending
def test_experiments_cover_20_maps():
    result = run_experiments(n_maps=20, seed=0)
    check_contract("experiments", result)
    assert len(result["answer"]["random_maps"]["maps"]) == 20


def test_equal_split_crafting_is_infeasible_for_40_minutes_and_worse_than_117_for_50(scenario):
    assert equal_split_crafting(scenario, 40) is None
    plan = equal_split_crafting(scenario, 50)
    # the optimum is 117, so a naive plan can never beat it
    assert plan is not None and sum(plan[0]) == 14 and plan[1] <= 117


def test_equal_split_crafting_boundary_42_min(scenario):
    # 14 slots * 3 min (fastest recipe) = 42 min is the theoretical boundary
    assert equal_split_crafting(scenario, 41) is None
    plan_42 = equal_split_crafting(scenario, 42)
    assert plan_42 is not None and sum(plan_42[0]) == 14


def test_nearest_neighbour_custom_start_and_access(time_matrix):
    res = nearest_neighbour(time_matrix["matrix"], time_matrix["labels"], start="C1")
    assert res.tour[0] == "C1" and res.tour[-1] == "C1"
    assert res.cost == res[1]
    assert res._asdict()["cost"] == res.cost
    assert res.to_dict()["cost"] == res.cost
    assert len(res.tour) == len(time_matrix["labels"]) + 1


def test_greedy_assignment_unbalanced():
    scores = [
        [10, 20],
        [30, 40],
        [15, 25],
    ]
    pairs, total = greedy_assignment(scores)
    assert total == 50  # Weapon 1 -> Boss 2 (20), Weapon 2 -> Boss 1 (30), Weapon 3 unassigned
    assert pairs == [[1, 2], [2, 1]]


def test_result_types_support_copy_deepcopy_and_pickle():
    """TourResult, AssignmentResult, and CraftingPlan must support copy, deepcopy, and pickle."""
    # 1. TourResult
    tr = TourResult(["Base", "C1", "Base"], 42)
    assert copy.copy(tr) == tr
    assert copy.deepcopy(tr) == tr
    tr_pickled = pickle.loads(pickle.dumps(tr))
    assert tr_pickled == tr
    assert tr_pickled.tour == ["Base", "C1", "Base"]
    assert tr_pickled.cost == 42
    tour, cost = tr
    assert tour == ["Base", "C1", "Base"] and cost == 42
    assert tr.to_dict() == {"tour": ["Base", "C1", "Base"], "cost": 42}
    assert tr._asdict() == {"tour": ["Base", "C1", "Base"], "cost": 42}

    # 2. AssignmentResult
    ar = AssignmentResult([[1, 2], [2, 1]], 50)
    assert copy.copy(ar) == ar
    assert copy.deepcopy(ar) == ar
    ar_pickled = pickle.loads(pickle.dumps(ar))
    assert ar_pickled == ar
    assert ar_pickled.pairs == [[1, 2], [2, 1]]
    assert ar_pickled.total == 50
    pairs, total = ar
    assert pairs == [[1, 2], [2, 1]] and total == 50
    assert ar.to_dict() == {"pairs": [[1, 2], [2, 1]], "total": 50}
    assert ar._asdict() == {"pairs": [[1, 2], [2, 1]], "total": 50}

    # 3. CraftingPlan
    cp = CraftingPlan([7, 0, 4, 3], 117)
    assert copy.copy(cp) == cp
    assert copy.deepcopy(cp) == cp
    cp_pickled = pickle.loads(pickle.dumps(cp))
    assert cp_pickled == cp
    assert cp_pickled.x == [7, 0, 4, 3]
    assert cp_pickled.score == 117
    x, score = cp
    assert x == [7, 0, 4, 3] and score == 117
    assert cp.to_dict() == {"x": [7, 0, 4, 3], "score": 117}
    assert cp._asdict() == {"x": [7, 0, 4, 3], "score": 117}


def test_nearest_neighbour_start_validation():
    """nearest_neighbour rejects unknown labels, negative indices, and out-of-range indices."""
    matrix = [[0, 10], [10, 0]]
    labels = ["Base", "C1"]

    # Unknown label (e.g. typo)
    with pytest.raises(ValueError, match="Unknown start label 'Basee'"):
        nearest_neighbour(matrix, labels, start="Basee")

    # Negative index
    with pytest.raises(ValueError, match="out of range"):
        nearest_neighbour(matrix, labels, start=-1)

    # Out of range index
    with pytest.raises(ValueError, match="out of range"):
        nearest_neighbour(matrix, labels, start=99)

    # Invalid type
    with pytest.raises(ValueError, match="start must be a string label or integer index"):
        nearest_neighbour(matrix, labels, start=True)


def test_nearest_neighbour_empty_single_node_and_dimension_validation():
    """nearest_neighbour handles empty and single-node matrices, and rejects dimension mismatches."""
    # Empty
    res_empty = nearest_neighbour([], [])
    assert res_empty == ([], 0)

    # Single-node
    res_single = nearest_neighbour([[0]], ["Base"], start="Base")
    assert res_single == (["Base", "Base"], 0)

    # Label vs matrix dimension mismatch
    with pytest.raises(ValueError, match="Dimension mismatch"):
        nearest_neighbour([[0]], ["Base", "C1"])

    # Non-square matrix
    with pytest.raises(ValueError, match="Matrix must be square"):
        nearest_neighbour([[0, 1], [0]], ["Base", "C1"])


def test_nearest_neighbour_unreachable_node_and_partial_tour():
    """nearest_neighbour raises ValueError when no finite arc remains or return to start is unreachable."""
    labels = ["Base", "C1", "C2"]

    # Outgoing candidate is unreachable (all infinite or NaN)
    matrix_blocked = [
        [0, float("inf"), float("inf")],
        [float("inf"), 0, 5],
        [float("inf"), 5, 0],
    ]
    with pytest.raises(ValueError, match="No reachable unvisited node"):
        nearest_neighbour(matrix_blocked, labels, start="Base")

    # Return arc to start is unreachable
    matrix_no_return = [
        [0, 5, float("inf")],
        [float("inf"), 0, 5],
        [float("inf"), float("inf"), 0],  # from C2 cannot reach Base
    ]
    with pytest.raises(ValueError, match="No reachable return arc"):
        nearest_neighbour(matrix_no_return, labels, start="Base")


def test_nearest_neighbour_tie_breaking_picks_lowest_index():
    """nearest_neighbour breaks distance ties by picking the candidate with the lowest index."""
    # From Base (idx 0), C1 (idx 1), C2 (idx 2), and C3 (idx 3) all have identical distance 10
    matrix = [
        [0, 10, 10, 10],
        [10, 0, 10, 10],
        [10, 10, 0, 10],
        [10, 10, 10, 0],
    ]
    labels = ["Base", "C1", "C2", "C3"]
    res = nearest_neighbour(matrix, labels, start="Base")
    assert res.tour == ["Base", "C1", "C2", "C3", "Base"]
    assert res.cost == 40


def test_greedy_assignment_more_bosses_than_weapons_and_tie_breaking():
    """greedy_assignment handles more bosses than weapons and breaks score ties by lowest column index."""
    # 2 weapons, 4 bosses
    scores = [
        [10, 50, 30, 20],
        [15, 45, 60, 25],
    ]
    pairs, total = greedy_assignment(scores)
    # Weapon 1 takes Boss 2 (score 50)
    # Weapon 2 takes Boss 3 (score 60)
    assert pairs == [[1, 2], [2, 3]]
    assert total == 110

    # Tie-breaking on equal scores: Weapon 1 has score 50 on Boss 1 and Boss 2
    scores_tie = [
        [50, 50],
        [20, 30],
    ]
    pairs_tie, total_tie = greedy_assignment(scores_tie)
    # Weapon 1 takes Boss 1 (index 0, 1-based: 1)
    # Weapon 2 takes Boss 2 (index 1, 1-based: 2)
    assert pairs_tie == [[1, 1], [2, 2]]
    assert total_tie == 80


def test_greedy_assignment_negative_scores():
    """greedy_assignment functions correctly with all-negative scores."""
    scores = [
        [-10, -50],
        [-20, -5],
    ]
    pairs, total = greedy_assignment(scores)
    # Weapon 1 chooses max(-10, -50) = Boss 1 (-10)
    # Weapon 2 chooses remaining Boss 2 (-5)
    assert pairs == [[1, 1], [2, 2]]
    assert total == -15


def test_greedy_assignment_validation_ragged_nan_and_types():
    """greedy_assignment validates rectangular, finite, numeric matrix up front."""
    # Empty
    assert greedy_assignment([]) == ([], 0)
    assert greedy_assignment([[]]) == ([], 0)

    # Ragged rows
    with pytest.raises(ValueError, match="scores must be rectangular"):
        greedy_assignment([[1, 2], [3]])

    with pytest.raises(ValueError, match="scores must be rectangular"):
        greedy_assignment([[1, 2], [3, 4, 5]])

    # Non-finite values
    with pytest.raises(ValueError, match="must be a finite number"):
        greedy_assignment([[1, float("nan")], [3, 4]])

    with pytest.raises(ValueError, match="must be a finite number"):
        greedy_assignment([[1, float("inf")], [3, 4]])

    # Non-numeric or boolean values
    with pytest.raises(ValueError, match="must be a finite number"):
        greedy_assignment([[1, True], [3, 4]])

    with pytest.raises(ValueError, match="must be a finite number"):
        greedy_assignment([[1, "invalid"], [3, 4]])


@pending
def test_experiments_are_reproducible_for_the_same_seed():
    a, b = run_experiments(n_maps=3, seed=5), run_experiments(n_maps=3, seed=5)

    def strip(result):  # timings differ between runs, everything else must repeat
        maps = result["answer"]["random_maps"]["maps"]
        return [{k: v for k, v in m.items() if "ms" not in k} for m in maps]

    assert strip(a) == strip(b)

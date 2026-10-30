from conftest import check_contract, pending
from solvers.baselines import equal_split_crafting, greedy_assignment, nearest_neighbour
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
    assert res["cost"] == res.cost
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


@pending
def test_experiments_are_reproducible_for_the_same_seed():
    a, b = run_experiments(n_maps=3, seed=5), run_experiments(n_maps=3, seed=5)

    def strip(result):  # timings differ between runs, everything else must repeat
        maps = result["answer"]["random_maps"]["maps"]
        return [{k: v for k, v in m.items() if "ms" not in k} for m in maps]

    assert strip(a) == strip(b)

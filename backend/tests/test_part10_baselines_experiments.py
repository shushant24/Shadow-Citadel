from conftest import check_contract, pending
from solvers.baselines import equal_split_crafting, greedy_assignment, nearest_neighbour
from solvers.experiments import run_experiments


@pending
def test_nearest_neighbour_is_80(time_matrix):
    tour, cost = nearest_neighbour(time_matrix["matrix"], time_matrix["labels"], start="Base")
    assert cost == 80
    assert tour == ["Base", "C7", "C5", "C3", "C4", "C1", "C6", "C2", "Base"]


@pending
def test_greedy_assignment_is_414(scenario):
    _pairs, total = greedy_assignment(scenario["weapon_boss_scores"])
    assert total == 414


@pending
def test_experiments_cover_20_maps():
    result = run_experiments(n_maps=20, seed=0)
    check_contract("experiments", result)
    assert len(result["answer"]["random_maps"]["maps"]) == 20


@pending
def test_equal_split_crafting_is_infeasible_for_40_minutes_and_worse_than_117_for_50(scenario):
    assert equal_split_crafting(scenario, 40) is None
    plan = equal_split_crafting(scenario, 50)
    # the optimum is 117, so a naive plan can never beat it
    assert plan is not None and sum(plan[0]) == 14 and plan[1] <= 117


@pending
def test_experiments_are_reproducible_for_the_same_seed():
    a, b = run_experiments(n_maps=3, seed=5), run_experiments(n_maps=3, seed=5)

    def strip(result):  # timings differ between runs, everything else must repeat
        maps = result["answer"]["random_maps"]["maps"]
        return [{k: v for k, v in m.items() if "ms" not in k} for m in maps]

    assert strip(a) == strip(b)

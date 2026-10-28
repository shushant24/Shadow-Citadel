import pytest
from conftest import check_envelope, pending
from solvers.baselines import greedy_assignment, nearest_neighbour
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
    check_envelope(result)
    assert len(result["answer"]["random_maps"]["maps"]) == 20

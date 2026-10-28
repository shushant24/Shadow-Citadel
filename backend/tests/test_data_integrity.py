"""Runs today: guards the shared data and fixtures every part builds on."""
import math

from conftest import check_envelope


def test_time_matrix_equals_rounded_euclidean_distances(scenario, time_matrix):
    nodes, labels = scenario["nodes"], time_matrix["labels"]
    computed = [[round(math.dist(nodes[a], nodes[b])) for b in labels] for a in labels]
    assert computed == time_matrix["matrix"]


def test_scenario_has_expected_shape(scenario):
    assert scenario["total_time"] == 120
    assert len(scenario["nodes"]) == 8 and len(scenario["loot"]) == 4
    assert len(scenario["weapon_boss_scores"]) == 5
    assert all(len(row) == 5 for row in scenario["weapon_boss_scores"])
    assert set(scenario["recipes"]) == {"score", "time", "weight", "stamina", "survival"}


def test_fixtures_follow_the_envelope(fixture):
    for name in ["hull", "route", "assign", "craft", "craft_infeasible", "pipeline", "experiments"]:
        check_envelope(fixture(name))


def test_fixtures_hold_the_section_4_expected_values(fixture):
    assert len(fixture("hull")["answer"]["vertices"]) == 7
    route = fixture("route")["answer"]
    assert (route["cost"], route["relaxation_cost"], route["nearest_neighbour"]["cost"]) == (70, 64, 80)
    assert fixture("assign")["answer"]["total"] == 445
    craft = fixture("craft")["answer"]
    assert (craft["x"], craft["z"]) == ([7, 0, 4, 3], 117)
    assert fixture("pipeline")["answer"]["total"] == 562
    assert fixture("craft_infeasible")["status"] == "infeasible"

import itertools
import pytest

from api.api_assign import AssignRequest, post_assign
from conftest import check_contract, check_envelope
from solvers.hungarian import solve_assignment


def brute_force_max(scores):
    """Test oracle for rectangular matrices (rows <= cols)."""
    rows, cols = len(scores), len(scores[0])
    return max(sum(scores[i][c] for i, c in enumerate(perm))
               for perm in itertools.permutations(range(cols), rows))


def test_demo_matchup_totals_445(scenario):
    result = solve_assignment(scenario["weapon_boss_scores"], maximize=True)
    check_envelope(result)
    assert result["answer"]["total"] == 445
    assert sorted(map(tuple, result["answer"]["pairs"])) == [(1, 5), (2, 3), (3, 2), (4, 1), (5, 4)]


def test_unbalanced_5_weapons_4_bosses(scenario):
    scores = [row[:4] for row in scenario["weapon_boss_scores"]]  # drop Boss 5
    # 5 weapons, 4 bosses -> a dummy column is needed; transpose to keep rows <= cols for the oracle
    result = solve_assignment(scores, maximize=True)
    assert len(result["answer"]["pairs"]) == 4
    assert result["answer"]["total"] == brute_force_max([list(col) for col in zip(*scores)])


def test_steps_end_with_final_phase(scenario):
    steps = solve_assignment(scenario["weapon_boss_scores"], maximize=True)["steps"]
    assert steps[0]["phase"] == "convert"
    assert steps[-1]["phase"] == "final"


def test_steps_follow_the_assign_contract(scenario, fixture):
    result = solve_assignment(scenario["weapon_boss_scores"], maximize=True)
    check_contract("assign", result)
    assert result["steps"][0]["matrix"] == fixture("assign")["steps"][0]["matrix"]  # c_ij = 97 - p_ij


def test_unbalanced_pads_a_dummy_column_and_reports_unassigned(scenario, fixture):
    scores = [row[:4] for row in scenario["weapon_boss_scores"]]
    result = solve_assignment(scores, maximize=True)
    check_contract("assign", result)
    assert result["answer"]["total"] == fixture("assign_unbalanced")["answer"]["total"] == 385
    assert result["steps"][0]["dummy_cols"] == [5]
    assert len(result["answer"]["unassigned"]["rows"]) == 1


def test_adjust_step_appears_when_zeros_need_more_lines(fixture):
    case = fixture("assign_adjust")
    result = solve_assignment(case["input"]["scores"], maximize=True)
    phases = [s["phase"] for s in result["steps"]]
    assert "adjust" in phases and phases[-1] == "final"
    assert result["answer"]["total"] == case["answer"]["total"] == 116


def test_minimization_mode_gives_the_cheapest_assignment():
    cost = [[4, 1, 3], [2, 0, 5], [3, 2, 2]]
    result = solve_assignment(cost, maximize=False)
    assert result["answer"]["total"] == 5


def test_small_scale_scores_handled_accurately():
    """Ensure tolerance scaling accurately handles small floating point scores."""
    s1 = [[3e-10, 1e-10, 2e-10], [1e-10, 3e-10, 2e-10], [2e-10, 1e-10, 3e-10]]
    res1 = solve_assignment(s1, maximize=True)
    assert sorted(map(tuple, res1["answer"]["pairs"])) == [(1, 1), (2, 2), (3, 3)]
    assert res1["answer"]["total"] == pytest.approx(9e-10)

    s2 = [[1e-10, 3e-10], [3e-10, 1e-10]]
    res2 = solve_assignment(s2, maximize=True)
    assert sorted(map(tuple, res2["answer"]["pairs"])) == [(1, 2), (2, 1)]
    assert res2["answer"]["total"] == pytest.approx(6e-10)


def test_minimization_mode_starts_with_convert_phase():
    """Minimization mode trace starts with convert step, matching maximize mode."""
    cost = [[4, 1, 3], [2, 0, 5], [3, 2, 2]]
    result = solve_assignment(cost, maximize=False)
    check_contract("assign", result)
    assert result["steps"][0]["phase"] == "convert"
    assert "Minimization costs used directly" in result["steps"][0]["note"]


def test_api_assign_dimension_caps_and_validation():
    """AssignRequest enforces 20x20 cap, rectangularity, and value magnitude limits (HTTP 422)."""
    # 21x1 matrix
    with pytest.raises(ValueError, match="more than 20 rows"):
        AssignRequest(scores=[[1.0]] * 21, maximize=True)

    # 1x21 matrix
    with pytest.raises(ValueError, match="more than 20 columns"):
        AssignRequest(scores=[[1.0] * 21], maximize=True)

    # Ragged matrix
    with pytest.raises(ValueError, match="every row needs the same number of columns"):
        AssignRequest(scores=[[1.0, 2.0], [3.0]], maximize=True)

    # Extreme magnitude (> 1e12 or overflow numbers like 1.7e308)
    with pytest.raises(ValueError, match="within magnitude"):
        AssignRequest(scores=[[1.7e308, -1.7e308], [0.0, 0.0]], maximize=True)

    # Valid 20x20 matrix
    mat_20x20 = [[float(i == j) for j in range(20)] for i in range(20)]
    req = AssignRequest(scores=mat_20x20, maximize=True)
    res = post_assign(req)
    assert res["status"] == "optimal"
    assert res["answer"]["total"] == 20


def test_exact_fraction_arithmetic_handles_close_gaps_and_mixed_scales():
    """Exact rational arithmetic distinguishes small gaps at large scales and mixed scales."""
    # Near gap at 1e12 scale
    res1 = solve_assignment([[1e12, 1e12 - 3], [1e12 - 3, 1e12]], maximize=True)
    assert sorted(map(tuple, res1["answer"]["pairs"])) == [(1, 1), (2, 2)]
    assert res1["answer"]["total"] == 2000000000000

    # Near gap in minimize mode
    res2 = solve_assignment([[1e9, 1e9 + 0.005], [1e9 + 0.005, 1e9]], maximize=False)
    assert sorted(map(tuple, res2["answer"]["pairs"])) == [(1, 1), (2, 2)]
    assert res2["answer"]["total"] == pytest.approx(2000000000.0)

    # Mixed scales: 1e6 and 1e-5
    res3 = solve_assignment([[1e6, 1e-5], [1e-5, 1e6]], maximize=True)
    assert sorted(map(tuple, res3["answer"]["pairs"])) == [(1, 1), (2, 2)]
    assert res3["answer"]["total"] == pytest.approx(2000000.0)


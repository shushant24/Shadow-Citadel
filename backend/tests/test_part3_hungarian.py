import itertools

from conftest import check_contract, check_envelope, pending
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

import itertools

from conftest import check_envelope, pending
from solvers.hungarian import solve_assignment


def brute_force_max(scores):
    """Test oracle for rectangular matrices (rows <= cols)."""
    rows, cols = len(scores), len(scores[0])
    return max(sum(scores[i][c] for i, c in enumerate(perm))
               for perm in itertools.permutations(range(cols), rows))


@pending
def test_demo_matchup_totals_445(scenario):
    result = solve_assignment(scenario["weapon_boss_scores"], maximize=True)
    check_envelope(result)
    assert result["answer"]["total"] == 445
    assert sorted(map(tuple, result["answer"]["pairs"])) == [(1, 5), (2, 3), (3, 2), (4, 1), (5, 4)]


@pending
def test_unbalanced_5_weapons_4_bosses(scenario):
    scores = [row[:4] for row in scenario["weapon_boss_scores"]]  # drop Boss 5
    # 5 weapons, 4 bosses -> a dummy column is needed; transpose to keep rows <= cols for the oracle
    result = solve_assignment(scores, maximize=True)
    assert len(result["answer"]["pairs"]) == 4
    assert result["answer"]["total"] == brute_force_max([list(col) for col in zip(*scores)])


@pending
def test_steps_end_with_final_phase(scenario):
    steps = solve_assignment(scenario["weapon_boss_scores"], maximize=True)["steps"]
    assert steps[0]["phase"] == "convert"
    assert steps[-1]["phase"] == "final"

import pytest
from conftest import check_envelope, crafting_lp, pending
from solvers.bigm import solve_bigm
from solvers.twophase import solve_twophase


@pending
def test_bigm_crafting_lp_gives_117(scenario):
    result = solve_bigm(*crafting_lp(scenario, 50), maximize=True)
    check_envelope(result)
    assert result["status"] == "optimal"
    assert result["answer"]["x"] == pytest.approx([7, 0, 4, 3])
    assert result["answer"]["z"] == pytest.approx(117)
    assert len(result["steps"]) > 0  # one item per pivot for the tableau stepper


@pending
def test_twophase_agrees_with_bigm(scenario):
    result = solve_twophase(*crafting_lp(scenario, 50), maximize=True)
    assert result["status"] == "optimal"
    assert result["answer"]["z"] == pytest.approx(117)


@pending
def test_40_minute_case_is_infeasible(scenario):
    for solve in (solve_bigm, solve_twophase):
        assert solve(*crafting_lp(scenario, 40), maximize=True)["status"] == "infeasible"


def test_blands_rule_prevents_cycling():
    pytest.skip("TODO Part 1: add a classic cycling LP (e.g. Beale's example) and assert it terminates")


def test_unbounded_detection():
    pytest.skip("TODO Part 1: e.g. maximize x1 subject to x1 - x2 <= 1 must return 'unbounded'")

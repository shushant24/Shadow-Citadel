import pytest
from conftest import check_contract, check_envelope, crafting_lp, pending
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
def test_bigm_steps_follow_the_tableau_contract(scenario):
    """columns / basis / tableau / zrow {c, m} / pivot / z, first step = initial tableau, last = optimal."""
    result = solve_bigm(*crafting_lp(scenario, 50), maximize=True)
    check_contract("craft", {**result, "answer": {**_craft_answer_stub(result)}})
    steps = result["steps"]
    assert steps[0]["iteration"] == 0 and steps[-1]["pivot"] is None
    assert steps[0]["columns"] == ["x1", "x2", "x3", "x4", "s1", "s2", "s3", "e4", "a4", "a5"]
    assert any(v != 0 for v in steps[0]["zrow"]["m"])            # Big-M is symbolic: M terms are visible
    assert steps[-1]["z_m"] == 0                                 # ...and the objective value is M-free at the optimum


@pending
def test_twophase_steps_have_two_phases_and_no_m(scenario):
    steps = solve_twophase(*crafting_lp(scenario, 50), maximize=True)["steps"]
    assert {s["phase"] for s in steps} == {"phase1", "phase2"}
    assert all(v == 0 for s in steps for v in s["zrow"]["m"])
    assert any(c.startswith("a") for c in steps[-1]["columns"])  # artificial columns kept for the slots price


@pending
def test_twophase_agrees_with_bigm(scenario):
    result = solve_twophase(*crafting_lp(scenario, 50), maximize=True)
    assert result["status"] == "optimal"
    assert result["answer"]["z"] == pytest.approx(117)


@pending
def test_40_minute_case_is_infeasible(scenario):
    for solve in (solve_bigm, solve_twophase):
        assert solve(*crafting_lp(scenario, 40), maximize=True)["status"] == "infeasible"


def _craft_answer_stub(result):
    """Part 2 adds shadow prices etc.; here only the steps are under test, so fill the rest of the answer."""
    return {"x": result["answer"]["x"], "z": result["answer"]["z"],
            "shadow_prices": {"time": 0, "weight": 0, "slots": 0}, "binding": [], "method": "bigm",
            "constraint_names": ["time", "weight", "stamina", "survival", "slots"]}


def test_blands_rule_prevents_cycling():
    pytest.skip("TODO Part 1: add a classic cycling LP (e.g. Beale's example) and assert it terminates")


def test_unbounded_detection():
    pytest.skip("TODO Part 1: e.g. maximize x1 subject to x1 - x2 <= 1 must return 'unbounded'")

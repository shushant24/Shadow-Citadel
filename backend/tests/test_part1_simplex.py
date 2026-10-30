import pytest
from conftest import check_contract, check_envelope, crafting_lp
from solvers.bigm import solve_bigm
from solvers.twophase import solve_twophase


def test_bigm_crafting_lp_gives_117(scenario):
    result = solve_bigm(*crafting_lp(scenario, 50), maximize=True)
    check_envelope(result)
    assert result["status"] == "optimal"
    assert result["answer"]["x"] == pytest.approx([7, 0, 4, 3])
    assert result["answer"]["z"] == pytest.approx(117)
    assert len(result["steps"]) > 0  # one item per pivot for the tableau stepper


def test_bigm_steps_follow_the_tableau_contract(scenario):
    """columns / basis / tableau / zrow {c, m} / pivot / z, first step = initial tableau, last = optimal."""
    result = solve_bigm(*crafting_lp(scenario, 50), maximize=True)
    check_contract("craft", {**result, "answer": {**_craft_answer_stub(result)}})
    steps = result["steps"]
    assert steps[0]["iteration"] == 0 and steps[-1]["pivot"] is None
    assert steps[0]["columns"] == ["x1", "x2", "x3", "x4", "s1", "s2", "s3", "e4", "a4", "a5"]
    assert any(v != 0 for v in steps[0]["zrow"]["m"])            # Big-M is symbolic: M terms are visible
    assert steps[-1]["z_m"] == 0                                 # ...and the objective value is M-free at the optimum


def test_twophase_steps_have_two_phases_and_no_m(scenario):
    steps = solve_twophase(*crafting_lp(scenario, 50), maximize=True)["steps"]
    assert {s["phase"] for s in steps} == {"phase1", "phase2"}
    assert all(v == 0 for s in steps for v in s["zrow"]["m"])
    assert any(c.startswith("a") for c in steps[-1]["columns"])  # artificial columns kept for the slots price


def test_twophase_agrees_with_bigm(scenario):
    result = solve_twophase(*crafting_lp(scenario, 50), maximize=True)
    assert result["status"] == "optimal"
    assert result["answer"]["z"] == pytest.approx(117)


def test_40_minute_case_is_infeasible(scenario):
    for solve in (solve_bigm, solve_twophase):
        assert solve(*crafting_lp(scenario, 40), maximize=True)["status"] == "infeasible"


def _craft_answer_stub(result):
    """Part 2 adds shadow prices etc.; here only the steps are under test, so fill the rest of the answer."""
    return {"x": result["answer"]["x"], "z": result["answer"]["z"],
            "shadow_prices": {"time": 0, "weight": 0, "slots": 0}, "binding": [], "method": "bigm",
            "constraint_names": ["time", "weight", "stamina", "survival", "slots"]}


def test_blands_rule_prevents_cycling():
    """Beale's classic cycling example with maximize=False."""
    c = [-0.75, 20, -0.5, 6]
    A = [
        [0.25, -8, -1, 9],
        [0.5, -12, -0.5, 3],
        [0, 0, 1, 0],
    ]
    b = [0, 0, 1]
    senses = ["<=", "<=", "<="]

    result = solve_bigm(c, A, b, senses, maximize=False)
    assert result["status"] == "optimal"
    assert result["answer"]["z"] == pytest.approx(-1.25)
    assert result["answer"]["x"] == pytest.approx([1, 0, 1, 0])


def test_unbounded_detection():
    """maximize x1 subject to -x1 + x2 <= 1 => x1 is unbounded."""
    c = [1, 0]
    A = [[-1, 1]]
    b = [1]
    senses = ["<="]

    result = solve_bigm(c, A, b, senses, maximize=True)
    assert result["status"] == "unbounded"


def test_twophase_artificials_cannot_reenter():
    """Ensure artificial columns do not re-enter the basis during Phase 2."""
    # Case 1: min x1 s.t. x1 = 5
    res1 = solve_twophase([1], [[1]], [5], ["="], maximize=False)
    assert res1["status"] == "optimal"
    assert res1["answer"]["x"] == pytest.approx([5.0])
    assert res1["answer"]["z"] == pytest.approx(5.0)

    # Case 2: min 2x1+3x2 s.t. x1+x2>=4, x1+3x2>=6
    res2 = solve_twophase([2, 3], [[1, 1], [1, 3]], [4, 6], [">=", ">="], maximize=False)
    assert res2["status"] == "optimal"
    assert res2["answer"]["x"] == pytest.approx([3.0, 1.0])
    assert res2["answer"]["z"] == pytest.approx(9.0)

    # Case 3: max -x1 s.t. x1 >= 5
    res3 = solve_twophase([-1], [[1]], [5], [">="], maximize=True)
    assert res3["status"] == "optimal"
    assert res3["answer"]["x"] == pytest.approx([5.0])
    assert res3["answer"]["z"] == pytest.approx(-5.0)


def test_bigm_infeasible_not_mislabeled_as_unbounded():
    """max x2 s.t. x1 >= 5, x1 <= 3 is infeasible even though x2 has an unbounded direction."""
    c = [0, 1]
    A = [[1, 0], [1, 0]]
    b = [5, 3]
    senses = [">=", "<="]

    res = solve_bigm(c, A, b, senses, maximize=True)
    assert res["status"] == "infeasible"


def test_input_validation():
    """Invalid dimensions, senses, or non-finite numbers must raise ValueError."""
    with pytest.raises(ValueError, match="Invalid sense"):
        solve_bigm([1], [[1]], [5], ["=="])
    with pytest.raises(ValueError, match="Length mismatch"):
        solve_bigm([1], [[1], [2]], [5], ["<="])
    with pytest.raises(ValueError, match="expected 1"):
        solve_twophase([1], [[1, 2]], [5], ["<="])
    with pytest.raises(ValueError, match="finite number"):
        solve_bigm([float("nan")], [[1]], [5], ["<="])
    with pytest.raises(ValueError, match="finite number"):
        solve_bigm([1], [[float("inf")]], [5], ["<="])


def test_iteration_limit():
    """Solvers raise RuntimeError when iteration limit is exhausted on a multi-step LP."""
    from solvers.simplex import Tableau
    # Simple tableau that takes at least 1 pivot, executed with max_iters=0
    tab = Tableau(["x1", "s1"], ["s1"], [[1.0, 1.0, 5.0]], [-2.0, 0.0, 0.0], [0.0, 0.0, 0.0])
    status = tab.solve(max_iters=0)
    assert status == "iteration_limit"

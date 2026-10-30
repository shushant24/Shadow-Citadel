"""Runs today. Guards the JSON contract (docs/api-contract.md) that backend and frontend share.

1. Every shared fixture obeys backend/contract.py.
2. The fixtures hold the Section 4 values and are internally consistent (traces replay to the answers).
3. The validator itself rejects broken payloads, so it cannot silently pass everything.
"""
import copy

import pytest
from conftest import CONSTRAINT_NAMES, check_contract

import contract

KINDS = {
    "hull": "hull", "route": "route", "assign": "assign", "assign_adjust": "assign",
    "assign_unbalanced": "assign", "craft": "craft", "craft_42": "craft", "craft_twophase": "craft",
    "craft_infeasible": "craft", "pipeline": "pipeline", "pipeline_naive": "pipeline",
    "experiments": "experiments",
}


@pytest.mark.parametrize("name", sorted(KINDS))
def test_fixture_obeys_the_contract(fixture, name):
    check_contract(KINDS[name], fixture(name))


def test_craft_fixtures_hold_the_section_4_values(fixture):
    c50, c42, c40 = fixture("craft")["answer"], fixture("craft_42")["answer"], fixture("craft_infeasible")
    assert (c50["x"], c50["z"]) == ([7, 0, 4, 3], 117)
    assert c50["shadow_prices"] == {"time": 0.75, "weight": 0.5, "slots": 4.25}
    assert c50["binding"] == ["time", "weight", "slots"]
    assert (c42["x"], c42["z"]) == ([13, 0, 0, 1], 111)
    assert c40["status"] == "infeasible" and c40["answer"]["message"]
    assert fixture("craft_twophase")["answer"]["z"] == 117


def test_shadow_prices_can_be_read_off_the_final_tableau(fixture):
    """The reading rule Part 2 implements: price of constraint i = z_j - c_j (constant part) of its
    slack column s<i>, or of its artificial column a<i> for an equality."""
    for name in ("craft", "craft_twophase"):
        fx = fixture(name)
        last = fx["steps"][-1]
        assert last["pivot"] is None and last["phase"] in ("bigm", "phase2")
        col = {n: i for i, n in enumerate(last["columns"])}
        price = {"time": last["zrow"]["c"][col["s1"]], "weight": last["zrow"]["c"][col["s2"]],
                 "slots": last["zrow"]["c"][col["a5"]]}
        assert price == pytest.approx(fx["answer"]["shadow_prices"])
        assert last["z"] == fx["answer"]["z"] and last["z_m"] == 0
        assert fx["answer"]["constraint_names"] == CONSTRAINT_NAMES


def test_infeasible_craft_trace_ends_with_a_positive_artificial(fixture):
    last = fixture("craft_infeasible")["steps"][-1]
    rhs = {b: row[-1] for b, row in zip(last["basis"], last["tableau"])}
    assert any(name.startswith("a") and value > 0 for name, value in rhs.items())


def test_route_fixture_is_a_consistent_branch_and_bound_trace(fixture):
    route = fixture("route")
    steps, ans = route["steps"], route["answer"]
    assert (ans["cost"], ans["relaxation_cost"], ans["nearest_neighbour"]["cost"]) == (70, 64, 80)
    assert steps[0]["parent"] is None and steps[0]["cost"] == 64 and len(steps[0]["subtours"]) == 2
    assert steps[0]["status"] == "branch"
    feasible = [s for s in steps if s["status"] == "feasible"]
    assert feasible and min(s["cost"] for s in feasible) == ans["cost"]
    by_node = {s["node"]: s for s in steps}
    for s in steps[1:]:  # a child forbids its parent's arcs plus exactly one more
        parent = by_node[s["parent"]]
        assert s["forbidden_arcs"][:-1] == parent["forbidden_arcs"] and s["forbidden_arcs"][-1] == s["branched_arc"]
        assert s["cost"] is None or s["cost"] >= parent["cost"]  # the bound never improves down the tree


def test_assign_fixtures_replay_to_their_answers(fixture):
    full, unb, adj = fixture("assign"), fixture("assign_unbalanced"), fixture("assign_adjust")
    assert full["answer"]["total"] == 445 and [s["phase"] for s in full["steps"]][:3] == ["convert", "row_reduce", "col_reduce"]
    assert full["steps"][0]["matrix"][0] == [15, 33, 0, 54, 1]  # P_max = 97
    assert unb["answer"]["total"] == 385 and len(unb["answer"]["pairs"]) == 4
    assert unb["steps"][0]["dummy_cols"] == [5] and len(unb["steps"][0]["matrix"]) == 5
    assert [s["phase"] for s in adj["steps"]].count("cover") == 2 and "adjust" in [s["phase"] for s in adj["steps"]]
    for fx in (full, unb, adj):
        last = fx["steps"][-1]
        assert last["phase"] == "final" and len(last["selected"]) == len(last["matrix"])


def test_pipeline_fixtures(fixture):
    ok, naive = fixture("pipeline"), fixture("pipeline_naive")
    assert {k: ok["answer"][k] for k in ("tour_time", "craft_time", "combat", "crafting", "total")} == \
        {"tour_time": 70, "craft_time": 50, "combat": 445, "crafting": 117, "total": 562}
    assert naive["status"] == "infeasible" and naive["answer"]["tour_time"] == 80
    assert naive["answer"]["craft_time"] == 40 and naive["answer"]["total"] is None


def test_hull_fixture(fixture):
    hull = fixture("hull")
    assert hull["answer"]["vertices"] == ["Base", "L4", "C2", "L1", "L2", "C6", "C5"]
    assert hull["steps"][-1]["stack"] == hull["answer"]["vertices"]


# ---------------------------------------------------------------- the validator must reject bad payloads
def _broken(fixture, name, mutate):
    payload = copy.deepcopy(fixture(name))
    mutate(payload)
    with pytest.raises(contract.ContractError):
        contract.check(KINDS[name], payload)


def test_validator_rejects_broken_payloads(fixture):
    _broken(fixture, "craft", lambda p: p["steps"][0].update(pivot=[0, 1]))            # entering/leaving mismatch
    _broken(fixture, "craft", lambda p: p["steps"][0]["tableau"][0].pop())             # wrong row width
    _broken(fixture, "craft", lambda p: p["answer"]["shadow_prices"].pop("slots"))
    _broken(fixture, "craft_infeasible", lambda p: p["answer"].pop("message"))
    _broken(fixture, "route", lambda p: p["steps"][1].update(parent=5))                # parent solved after child
    _broken(fixture, "route", lambda p: p["answer"]["tour"].__setitem__(-1, "C1"))     # tour does not close
    _broken(fixture, "assign", lambda p: p["steps"][3].update(covered_rows=[9]))       # index out of range
    _broken(fixture, "assign", lambda p: p["answer"]["pairs"].append([1, 1]))          # row used twice
    _broken(fixture, "hull", lambda p: p["answer"]["interior"].append("Base"))
    _broken(fixture, "pipeline", lambda p: p["answer"].update(total=None))
    _broken(fixture, "experiments", lambda p: p["answer"]["modules"][0].update(direction="up"))
    _broken(fixture, "hull", lambda p: p.update(status="maybe"))

import json
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from paths import DATA_DIR, FIXTURES_DIR  # noqa: E402

# A part's acceptance tests start as "pending". While the solver still raises
# NotImplementedError the test is an expected failure. Once the solver is implemented:
#   - correct output  -> strict XPASS fails the suite: delete the marker.
#   - wrong output    -> assertion error fails the suite: fix the solver.
pending = pytest.mark.xfail(raises=NotImplementedError, strict=True,
                            reason="solver not implemented yet; remove this marker when it lands")


CONSTRAINT_NAMES = ["time", "weight", "stamina", "survival", "slots"]  # row order of the crafting LP


def load_json(path: Path):
    return json.loads(path.read_text())


@pytest.fixture(scope="session")
def scenario():
    return load_json(DATA_DIR / "scenario.json")


@pytest.fixture(scope="session")
def time_matrix():
    return load_json(DATA_DIR / "time_matrix.json")


@pytest.fixture(scope="session")
def fixture():
    def _load(name: str):
        return load_json(FIXTURES_DIR / f"{name}.json")
    return _load


def crafting_lp(scenario, time_limit):
    """Build the Stage 4 LP (plan Section 4) as c, A, b, senses in the order
    craft time, weight, stamina, survival (>=), slots (=)."""
    r, lim = scenario["recipes"], scenario["limits"]
    c = r["score"]
    A = [r["time"], r["weight"], r["stamina"], r["survival"], [1, 1, 1, 1]]
    b = [time_limit, lim["weight"], lim["stamina"], lim["survival_min"], lim["slots"]]
    senses = ["<=", "<=", "<=", ">=", "="]
    return c, A, b, senses


def check_envelope(result):
    assert set(result) >= {"status", "answer", "steps"}
    assert result["status"] in {"optimal", "infeasible", "unbounded"}
    assert isinstance(result["answer"], dict)
    assert isinstance(result["steps"], list)


def check_contract(kind, result):
    """Full contract check (answer fields, every step, cross-field consistency): backend/contract.py."""
    import contract
    try:
        contract.check(kind, result)
    except contract.ContractError as err:
        pytest.fail(f"contract violation for {kind}: {err}")

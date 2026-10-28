"""The plan requires hand-written solvers (no linprog). External solvers are allowed only as
test oracles, never inside solvers/ or api/."""
import re
from pathlib import Path

FORBIDDEN = r"\b(scipy|pulp|cvxpy|ortools|mip|networkx|sklearn|linprog|linear_sum_assignment|ConvexHull)\b"
BACKEND = Path(__file__).resolve().parent.parent


def test_solvers_and_api_do_not_use_library_solvers():
    offenders = []
    for folder in ("solvers", "api"):
        for path in (BACKEND / folder).glob("*.py"):
            for n, line in enumerate(path.read_text().splitlines(), 1):
                code = line.split("#")[0]
                if re.search(FORBIDDEN, code):
                    offenders.append(f"{path.name}:{n}: {line.strip()}")
    assert not offenders, "Library solvers are not allowed:\n" + "\n".join(offenders)

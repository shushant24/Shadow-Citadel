"""The plan requires hand-written solvers (no linprog). External solvers are allowed only as
test oracles (inside tests/), never inside solvers/ or api/.

The check parses the code with `ast`, so docstrings and comments may mention the library names."""
import ast
from pathlib import Path

FORBIDDEN_MODULES = {"scipy", "pulp", "cvxpy", "ortools", "mip", "networkx", "sklearn"}
FORBIDDEN_NAMES = {"linprog", "linear_sum_assignment", "ConvexHull", "milp"}
BACKEND = Path(__file__).resolve().parent.parent


def offenders_in(source: str, filename: str = "<src>"):
    found = []
    for node in ast.walk(ast.parse(source, filename)):
        if isinstance(node, ast.Import):
            found += [(node.lineno, a.name) for a in node.names if a.name.split(".")[0] in FORBIDDEN_MODULES]
        elif isinstance(node, ast.ImportFrom):
            if (node.module or "").split(".")[0] in FORBIDDEN_MODULES:
                found.append((node.lineno, node.module))
            found += [(node.lineno, a.name) for a in node.names if a.name in FORBIDDEN_NAMES]
        elif isinstance(node, ast.Name) and node.id in FORBIDDEN_NAMES:
            found.append((node.lineno, node.id))
        elif isinstance(node, ast.Attribute) and node.attr in FORBIDDEN_NAMES:
            found.append((node.lineno, node.attr))
    return found


def test_solvers_and_api_do_not_use_library_solvers():
    offenders = []
    for folder in ("solvers", "api"):
        for path in (BACKEND / folder).glob("*.py"):
            offenders += [f"{path.name}:{line}: {what}" for line, what in offenders_in(path.read_text(), str(path))]
    assert not offenders, "Library solvers are not allowed:\n" + "\n".join(offenders)


def test_the_checker_itself_catches_real_usage_but_not_docstrings():
    assert offenders_in("from scipy.optimize import linprog")
    assert offenders_in("import networkx as nx")
    assert offenders_in("x = scipy.optimize.linprog(c)")
    assert not offenders_in('"""No scipy or linprog here."""\n# scipy in a comment\nx = 1')

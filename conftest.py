"""Pytest fixtures and configuration for Task 2."""
try:
    import pytest
    fixture = pytest.fixture
except ImportError:
    fixture = lambda x: x

CONSTRAINT_NAMES = ["time", "weight", "stamina", "survival", "slots"]


def pending(func):
    """Decorator for tests in progress."""
    return func


@pytest.fixture
def scenario():
    return {
        "total_time": 120,
        "nodes": {
            "Base": [0, 0],
            "C1": [15, 18],
            "C2": [19, 5],
            "C3": [7, 14],
            "C4": [9, 11],
            "C5": [2, 9],
            "C6": [5, 20],
            "C7": [2, 5],
        },
        "loot": {"L1": [23, 12], "L2": [12, 23], "L3": [5, 16], "L4": [16, 4]},
        "weapon_boss_scores": [
            [82, 64, 97, 43, 96],
            [48, 40, 61, 59, 50],
            [83, 97, 81, 50, 61],
            [95, 78, 72, 60, 84],
            [69, 79, 54, 96, 66],
        ],
        "recipes": {
            "score": [8, 6, 10, 7],
            "time": [3, 4, 5, 3],
            "weight": [3, 2, 4, 1],
            "stamina": [4, 1, 5, 3],
            "survival": [5, 2, 0, 3],
        },
        "limits": {"weight": 40, "stamina": 90, "survival_min": 30, "slots": 14},
    }


def crafting_lp(scenario, minutes):
    """Build the crafting LP (c, A, b, senses) from the scenario and a given time limit."""
    c = [float(x) for x in scenario["recipes"]["score"]]
    A = [
        [float(x) for x in scenario["recipes"]["time"]],
        [float(x) for x in scenario["recipes"]["weight"]],
        [float(x) for x in scenario["recipes"]["stamina"]],
        [float(x) for x in scenario["recipes"]["survival"]],
        [1.0] * len(c),
    ]
    b = [
        float(minutes),
        float(scenario["limits"]["weight"]),
        float(scenario["limits"]["stamina"]),
        float(scenario["limits"]["survival_min"]),
        float(scenario["limits"]["slots"]),
    ]
    senses = ["<=", "<=", "<=", ">=", "="]
    return c, A, b, senses

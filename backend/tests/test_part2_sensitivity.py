import pytest
from conftest import CONSTRAINT_NAMES, crafting_lp, pending
from solvers.bigm import solve_bigm
from solvers.sensitivity import bottleneck_text, rhs_ranging, shadow_prices


def _final_step(scenario, minutes):
    result = solve_bigm(*crafting_lp(scenario, minutes), maximize=True)
    return result["steps"][-1]


@pending
def test_shadow_prices_for_50_minutes(scenario):
    prices = shadow_prices(_final_step(scenario, 50), CONSTRAINT_NAMES)
    assert prices["time"] == pytest.approx(0.75)
    assert prices["weight"] == pytest.approx(0.50)
    assert prices["slots"] == pytest.approx(4.25)
    assert prices.get("stamina", 0) == pytest.approx(0)
    assert prices.get("survival", 0) == pytest.approx(0)


@pending
def test_42_minutes_scores_111(scenario):
    result = solve_bigm(*crafting_lp(scenario, 42), maximize=True)
    assert result["answer"]["z"] == pytest.approx(111)
    assert result["answer"]["x"] == pytest.approx([13, 0, 0, 1])


@pending
def test_rhs_ranging_covers_the_demo_rhs(scenario):
    ranges = rhs_ranging(_final_step(scenario, 50), CONSTRAINT_NAMES)
    low, high = ranges["time"]
    assert low <= 50 <= high


@pending
def test_bottleneck_text_names_craft_time():
    text = bottleneck_text({"time": 0.75, "weight": 0.5, "slots": 4.25, "stamina": 0, "survival": 0})
    assert "time" in text.lower()

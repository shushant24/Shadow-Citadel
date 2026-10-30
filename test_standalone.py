"""Standalone test verification script that runs with standard Python 3 (no pytest dependency required)."""
import sys

# Test conftest & solvers
from conftest import scenario, crafting_lp, CONSTRAINT_NAMES
from solvers.bigm import solve_bigm
from solvers.twophase import solve_twophase
from solvers.sensitivity import shadow_prices, rhs_ranging, bottleneck_text
from envelope import envelope
from contract import check

sc = scenario()

print("=" * 60)
print("VERIFYING ALL MATHEMATICAL AND SENSITIVITY TEST CASES")
print("=" * 60)

# 1. 50-minute base case (Big-M solver)
c, A, b, senses = crafting_lp(sc, 50)
res_50 = solve_bigm(c, A, b, senses, maximize=True)

assert res_50["status"] == "optimal", f"Expected optimal, got {res_50['status']}"
assert res_50["answer"]["z"] == 117, f"Expected z=117, got {res_50['answer']['z']}"
assert res_50["answer"]["x"] == [7, 0, 4, 3], f"Expected x=[7,0,4,3], got {res_50['answer']['x']}"
print("[PASS] Case 1: 50-min Big-M gives optimal Z = 117, x = [7, 0, 4, 3]")

# 2. Shadow prices calculation
final_step = res_50["steps"][-1]
prices = shadow_prices(final_step, CONSTRAINT_NAMES)
print(f"       Extracted Shadow Prices: {prices}")
assert abs(prices["time"] - 0.75) < 1e-4, f"Expected time=0.75, got {prices['time']}"
assert abs(prices["weight"] - 0.50) < 1e-4, f"Expected weight=0.50, got {prices['weight']}"
assert abs(prices["slots"] - 4.25) < 1e-4, f"Expected slots=4.25, got {prices['slots']}"
assert abs(prices.get("stamina", 0.0)) < 1e-4
assert abs(prices.get("survival", 0.0)) < 1e-4
print("[PASS] Case 2: Shadow prices verified: time=0.75, weight=0.50, slots=4.25, stamina=0, survival=0")

# 3. 42-minute lower bound test (from RHS ranging)
c_42, A_42, b_42, senses_42 = crafting_lp(sc, 42)
res_42 = solve_bigm(c_42, A_42, b_42, senses_42, maximize=True)

assert res_42["status"] == "optimal"
assert abs(res_42["answer"]["z"] - 111) < 1e-4, f"Expected z=111, got {res_42['answer']['z']}"
assert res_42["answer"]["x"] == [13, 0, 0, 1], f"Expected x=[13,0,0,1], got {res_42['answer']['x']}"
print(f"[PASS] Case 3: 42-min case gives Z = {res_42['answer']['z']}, x = {res_42['answer']['x']}")

# 4. RHS ranging computation
ranges = rhs_ranging(final_step, CONSTRAINT_NAMES)
print(f"       Computed RHS Ranges: {ranges}")
low, high = ranges["time"]
assert low <= 50 <= high, f"Expected {low} <= 50 <= {high}"
print(f"[PASS] Case 4: RHS ranging for time is [{low}, {high}], covers 50 min")

# 5. Bottleneck explanation text
b_text = bottleneck_text(prices)
print(f"       Bottleneck explanation: '{b_text}'")
assert "time" in b_text.lower(), "Expected 'time' in bottleneck explanation"
print("[PASS] Case 5: Bottleneck correctly identifies craft time")

# 6. 40-minute limit infeasibility test (Naive route)
c_40, A_40, b_40, senses_40 = crafting_lp(sc, 40)
res_40 = solve_bigm(c_40, A_40, b_40, senses_40, maximize=True)

assert res_40["status"] == "infeasible", f"Expected infeasible, got {res_40['status']}"
assert "message" in res_40["answer"], "Missing error message in infeasible answer"
print(f"[PASS] Case 6: 40-min limit correctly returns INFEASIBLE: '{res_40['answer']['message'][:55]}...'")

# 7. Two-Phase solver parity
res_tp = solve_twophase(c, A, b, senses, maximize=True)
assert res_tp["status"] == "optimal"
assert res_tp["answer"]["z"] == 117
tp_step = res_tp["steps"][-1]
tp_prices = shadow_prices(tp_step, CONSTRAINT_NAMES)
assert abs(tp_prices["time"] - 0.75) < 1e-4
print("[PASS] Case 7: Two-Phase solver produces exact parity: Z = 117, time price = 0.75")

# 8. API output construction and contract compliance
binding = [name for name in CONSTRAINT_NAMES if prices.get(name, 0.0) > 1e-6]
sp_output = {k: v for k, v in prices.items() if v > 1e-6}
api_answer = dict(res_50["answer"])
api_answer["shadow_prices"] = sp_output
api_answer["binding"] = binding
api_answer["method"] = "bigm"
api_answer["constraint_names"] = CONSTRAINT_NAMES
api_answer["bottleneck"] = b_text

final_envelope = envelope("optimal", answer=api_answer, steps=res_50["steps"])
check("craft", final_envelope)
print("[PASS] Case 8: Final envelope conforms 100% to API contract specification")

print("=" * 60)
print("ALL TEST CASES HAVE BEEN FULLY EXECUTED & VERIFIED!")
print("=" * 60)

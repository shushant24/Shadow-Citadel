import { api, FIXTURE_EXTRAS } from "../api.js";
import scenario from "@fixtures/scenario.json";

const craftReq = (time_limit, method = "bigm") => ({
  time_limit, recipes: scenario.recipes, limits: scenario.limits, method,
});

test("fixture craft: 50 minutes gives 117 with a tableau trace for both methods", async () => {
  const bigm = await api.craft(craftReq(50));
  expect(bigm.answer.z).toBe(117);
  expect(bigm.steps.length).toBeGreaterThan(0);
  const two = await api.craft(craftReq(50, "twophase"));
  expect(two.answer.method).toBe("twophase");
  expect(new Set(two.steps.map((s) => s.phase))).toEqual(new Set(["phase1", "phase2"]));
});

test("fixture craft: 42 minutes gives 111 and 40 minutes is infeasible with a message", async () => {
  expect((await api.craft(craftReq(42))).answer.z).toBe(111);
  const infeasible = await api.craft(craftReq(40));
  expect(infeasible.status).toBe("infeasible");
  expect(infeasible.answer.message).toMatch(/40 minutes/);
});

test("fixture assign: square grid is the 445 demo, a 5x4 grid is the unbalanced case", async () => {
  expect((await api.assign(scenario.weapon_boss_scores)).answer.total).toBe(445);
  const unbalanced = await api.assign(scenario.weapon_boss_scores.map((r) => r.slice(0, 4)));
  expect(unbalanced.answer.total).toBe(385);
  expect(unbalanced.steps[0].dummy_cols).toEqual([5]);
  expect(FIXTURE_EXTRAS.assignAdjust.steps.some((s) => s.phase === "adjust")).toBe(true);
});

test("fixture pipeline: optimal route totals 562, naive route makes crafting infeasible", async () => {
  expect((await api.pipeline(scenario)).answer.total).toBe(562);
  const naive = await api.pipeline(scenario, "nearest_neighbour");
  expect(naive.status).toBe("infeasible");
  expect(naive.answer.craft_time).toBe(40);
});

test("fixture route accepts a matrix request or a points request", async () => {
  expect((await api.route({ matrix: [[0]], labels: ["Base"] })).answer.cost).toBe(70);
  expect((await api.route({ points: scenario.nodes })).answer.nearest_neighbour.cost).toBe(80);
});

test("fixtures are cloned: mutating a result does not leak into the next call", async () => {
  const first = await api.craft(craftReq(50));
  first.answer.z = -1;
  expect((await api.craft(craftReq(50))).answer.z).toBe(117);
});

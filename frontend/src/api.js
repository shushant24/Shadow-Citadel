// API client (Part 6). Every endpoint returns the envelope { status, answer, steps }
// (GET /api/scenario returns the raw scenario file). Contract: docs/api-contract.md
import scenarioFx from "@fixtures/scenario.json";
import hullFx from "@fixtures/hull.json";
import routeFx from "@fixtures/route.json";
import assignFx from "@fixtures/assign.json";
import assignUnbalancedFx from "@fixtures/assign_unbalanced.json";
import assignAdjustFx from "@fixtures/assign_adjust.json";
import assignAdjustMinFx from "@fixtures/assign_adjust_min.json";
import assign4x5Fx from "@fixtures/assign_4x5.json";
import craftFx from "@fixtures/craft.json";
import craft42Fx from "@fixtures/craft_42.json";
import craftTwoPhaseFx from "@fixtures/craft_twophase.json";
import craftInfeasibleFx from "@fixtures/craft_infeasible.json";
import pipelineFx from "@fixtures/pipeline.json";
import pipelineNaiveFx from "@fixtures/pipeline_naive.json";
import experimentsFx from "@fixtures/experiments.json";

export const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES !== "false";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

/** Extra canned results for tabs that want to demo a special case (Matchups: the cover/adjust loop). */
export const FIXTURE_EXTRAS = { assignAdjust: assignAdjustFx, assignAdjustMin: assignAdjustMinFx };

/**
 * Fixture mode answers from a handful of canned results, so interactive controls only "work" at these points.
 * Anything else returns the nearest canned result. Use the live backend (VITE_USE_FIXTURES=false) to demo them.
 */
export const FIXTURE_LIMITS =
  "crafting: <42 min infeasible, 42 min = 111, otherwise the 50-minute plan; " +
  "matchups: 5x5 = the 445 demo, 5x4 = 385, 4x5 = 349, 4x4 = the adjust cases (maximize 116, minimize 17), any other grid gets the nearest of these; " +
  "map: dragging a point does not change the route or hull.";

async function live(method, path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`${method} ${path} failed (${res.status}): ${detail}`);
  }
  return res.json();
}

const later = (value) => Promise.resolve(structuredClone(value));

function craftFixture(req) {
  const t = req.time_limit;
  if (t < 42) return craftInfeasibleFx; // 41 minutes is also infeasible: 42 is the smallest feasible limit
  if (t === 42) return craft42Fx;
  return req.method === "twophase" ? craftTwoPhaseFx : craftFx;
}

function assignFixture(scores, maximize = true) {
  const rows = scores.length;
  const cols = scores[0]?.length ?? 0;
  if (rows === 4 && cols === 4) return maximize ? assignAdjustFx : assignAdjustMinFx; // cover + adjust loop
  if (rows === 4 && cols === 5) return assign4x5Fx; // more bosses than weapons
  const square = scores.every((row) => row.length === rows);
  return square ? assignFx : assignUnbalancedFx;
}

export const api = {
  scenario: () => (USE_FIXTURES ? later(scenarioFx) : live("GET", "/api/scenario")),

  /** points: { name: [x, y] } */
  hull: (points) => (USE_FIXTURES ? later(hullFx) : live("POST", "/api/hull", { points })),

  /** req: { matrix, labels } or { points } (drag-to-recompute; labels = key order, first key is the depot) */
  route: (req) => (USE_FIXTURES ? later(routeFx) : live("POST", "/api/route", req)),

  assign: (scores, maximize = true) =>
    USE_FIXTURES ? later(assignFixture(scores, maximize)) : live("POST", "/api/assign", { scores, maximize }),

  /** req: { time_limit, recipes, limits, method: "bigm" | "twophase" } */
  craft: (req) => (USE_FIXTURES ? later(craftFixture(req)) : live("POST", "/api/craft", req)),

  /** route: "optimal" (default) or "nearest_neighbour" (naive baseline: crafting becomes infeasible) */
  pipeline: (scenario, route = "optimal") =>
    USE_FIXTURES
      ? later(route === "optimal" ? pipelineFx : pipelineNaiveFx)
      : live("POST", `/api/pipeline?route=${route}`, scenario),

  experiments: () => (USE_FIXTURES ? later(experimentsFx) : live("GET", "/api/experiments")),
};

// API client (Part 6). Every endpoint returns the envelope { status, answer, steps }
// (GET /api/scenario returns the raw scenario file). Contract: docs/api-contract.md
import scenarioFx from "@fixtures/scenario.json";
import hullFx from "@fixtures/hull.json";
import routeFx from "@fixtures/route.json";
import assignFx from "@fixtures/assign.json";
import craftFx from "@fixtures/craft.json";
import craftInfeasibleFx from "@fixtures/craft_infeasible.json";
import pipelineFx from "@fixtures/pipeline.json";
import experimentsFx from "@fixtures/experiments.json";

export const USE_FIXTURES = import.meta.env.VITE_USE_FIXTURES !== "false";
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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

export const api = {
  scenario: () => (USE_FIXTURES ? later(scenarioFx) : live("GET", "/api/scenario")),
  hull: (points) => (USE_FIXTURES ? later(hullFx) : live("POST", "/api/hull", { points })),
  route: (matrix, labels) =>
    USE_FIXTURES ? later(routeFx) : live("POST", "/api/route", { matrix, labels }),
  assign: (scores, maximize = true) =>
    USE_FIXTURES ? later(assignFx) : live("POST", "/api/assign", { scores, maximize }),
  craft: (req) =>
    USE_FIXTURES
      ? later(req.time_limit < 42 ? craftInfeasibleFx : craftFx) // fixtures only know 40 min vs 50 min
      : live("POST", "/api/craft", req),
  pipeline: (scenario) =>
    USE_FIXTURES ? later(pipelineFx) : live("POST", "/api/pipeline", scenario),
  experiments: () =>
    USE_FIXTURES ? later(experimentsFx) : live("GET", "/api/experiments"),
};

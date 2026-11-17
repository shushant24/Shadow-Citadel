// "View map" on a benchmark row loads that map into every tab (live-backend mode).
// The live answers come from __tests__/data/benchmark_maps.json, captured from the real backend.
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import App from "../App.jsx";
import { api } from "../api.js";
import experimentsFx from "@fixtures/experiments.json";
import routeFx from "@fixtures/route.json";
import hullFx from "@fixtures/hull.json";
import assignFx from "@fixtures/assign.json";
import pipelineFx from "@fixtures/pipeline.json";
import pipelineNaiveFx from "@fixtures/pipeline_naive.json";
import craftFx from "@fixtures/craft.json";
import craftInfeasibleFx from "@fixtures/craft_infeasible.json";
import maps from "./data/benchmark_maps.json";

vi.mock("../api.js", async (importOriginal) => {
  const mod = await importOriginal();
  return { ...mod, USE_FIXTURES: false };
});

const isBenchmark = (nodes) => Boolean(nodes && "N1" in nodes);
const clone = (v) => Promise.resolve(structuredClone(v));

function mockLive(key) {
  const m = maps[key];
  vi.spyOn(api, "experiments").mockImplementation(() => clone(experimentsFx));
  vi.spyOn(api, "benchmarkMap").mockImplementation(() => clone(m.scenario));
  vi.spyOn(api, "route").mockImplementation((req) => clone(isBenchmark(req.points) ? m.route : routeFx));
  vi.spyOn(api, "hull").mockImplementation((pts) => clone(isBenchmark(pts) ? m.hull : hullFx));
  vi.spyOn(api, "assign").mockImplementation((scores) =>
    clone(JSON.stringify(scores) === JSON.stringify(m.scenario.weapon_boss_scores) ? m.assign : assignFx)
  );
  vi.spyOn(api, "pipeline").mockImplementation((sc, route = "optimal") => {
    if (isBenchmark(sc.nodes)) return clone(route === "optimal" ? m.pipeline : m.pipeline_nn);
    return clone(route === "optimal" ? pipelineFx : pipelineNaiveFx);
  });
  vi.spyOn(api, "craft").mockImplementation((req) => clone(req.time_limit < 42 ? craftInfeasibleFx : craftFx));
  return m;
}

async function openSummaryAndView(rowIndex, seed) {
  render(<App />);
  fireEvent.click(await screen.findByRole("tab", { name: "Summary" }));
  const btn = await screen.findByRole("button", { name: `View map #${rowIndex} (seed ${seed})` });
  expect(btn).toBeEnabled();
  fireEvent.click(btn);
}

describe("Benchmark map: View map → every tab", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("row 1 loads the 9-node map on the Map tab with its live raid score", async () => {
    const m = mockLive("row1");
    await openSummaryAndView(1, 1654615998);

    expect(api.benchmarkMap).toHaveBeenCalledWith(1654615998, 9);
    await waitFor(() => expect(screen.getByRole("tab", { name: "Map" })).toHaveAttribute("aria-selected", "true"));

    const banner = await screen.findByTestId("benchmark-banner");
    expect(banner).toHaveTextContent("Viewing benchmark map #1 (seed 1654615998, 9 nodes)");
    expect(await screen.findByText(/Scenario \(9 nodes, 0 loot drops\)/)).toBeInTheDocument();

    expect(await screen.findByRole("button", { name: "Optimal Tour (70m)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nearest Neighbour (72m)" })).toBeInTheDocument();

    // Generated float coordinates are labelled to one decimal, labels N1..N8
    const [x, y] = m.scenario.nodes.N1;
    expect(screen.getByText(`N1 (${x.toFixed(1)},${y.toFixed(1)})`)).toBeInTheDocument();
    expect(screen.getByText(/^N8 \(/)).toBeInTheDocument();

    // Subtours come from the API (4 loops on this map), not the demo's two
    fireEvent.click(screen.getByRole("button", { name: /^Subtours \(/ }));
    expect(screen.getByText(/Subtour 4 \(/)).toBeInTheDocument();
    expect(screen.queryByText(/C7/)).not.toBeInTheDocument();

    // Raid score from /api/pipeline: 408 combat + 117 crafting
    const opt = await screen.findByTestId("raid-score-optimal");
    await waitFor(() => expect(opt).toHaveTextContent(`${m.pipeline.answer.total} pts`));
    expect(opt).toHaveTextContent(`${m.pipeline.answer.combat} combat + ${m.pipeline.answer.crafting} crafting`);
    expect(opt).toHaveTextContent("70 min");
    expect(opt).toHaveTextContent("50 min");
    expect(screen.getByText(new RegExp(`crafting Z = ${m.pipeline.answer.crafting}`))).toBeInTheDocument();
  });

  it("the Summary tab shows the reproducibility check with all ✓", async () => {
    mockLive("row1");
    await openSummaryAndView(1, 1654615998);
    await screen.findByTestId("benchmark-banner");

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    const card = await screen.findByTestId("repro-card");
    await waitFor(() => expect(within(card).getAllByLabelText("match")).toHaveLength(4));
    expect(within(card).queryByLabelText("mismatch")).toBeNull();
    expect(within(card).getByTestId("repro-verdict")).toHaveTextContent(/All four values reproduced/);
    expect(within(card).getByTestId("repro-pipeline")).toHaveTextContent("525 pts");
    expect(screen.getAllByText("Demo scenario").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "View map #1 (seed 1654615998)" })).toHaveTextContent("Viewing");
  });

  it("the Matchups tab resets to the map's scores and Solve gives the row's Hungarian total", async () => {
    mockLive("row1");
    await openSummaryAndView(1, 1654615998);
    await screen.findByTestId("benchmark-banner");

    fireEvent.click(screen.getByRole("tab", { name: "Matchups" }));
    fireEvent.click(await screen.findByRole("button", { name: /^solve$/i }));
    await waitFor(() => expect(api.assign).toHaveBeenCalled());
    expect(api.assign.mock.calls.at(-1)[0]).toEqual(maps.row1.scenario.weapon_boss_scores);
    expect((await screen.findAllByText("408")).length).toBeGreaterThan(0);
  });

  it("row 12 (107-minute tour) shows crafting as infeasible without breaking any tab", async () => {
    const m = mockLive("row12");
    await openSummaryAndView(12, 316721330);

    const opt = await screen.findByTestId("raid-score-optimal");
    await waitFor(() => expect(opt).toHaveTextContent("Crafting infeasible: 13 min left, 42 needed"));
    expect(opt).toHaveTextContent(`${m.pipeline.answer.combat} pts (combat only)`);
    expect(screen.getByRole("button", { name: "Optimal Tour (107m)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Loadout" }));
    expect(await screen.findByTestId("infeasible-card")).toHaveTextContent("13 min available");
    expect(screen.queryByTestId("preset-optimal")).toBeNull(); // demo presets hidden
    const slider = screen.getByLabelText("Available Crafting Time Slider");
    expect(Number(slider.min)).toBeLessThanOrEqual(13);
    expect(slider).toHaveValue("13");

    fireEvent.click(screen.getByRole("tab", { name: "Matchups" }));
    expect(await screen.findByRole("button", { name: /^solve$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    const card = await screen.findByTestId("repro-card");
    await waitFor(() => expect(within(card).getAllByLabelText("match")).toHaveLength(4));
    expect(within(card).getByTestId("repro-pipeline")).toHaveTextContent("Crafting infeasible: 13 min left, 42 needed");
  });

  it("Back to demo scenario restores the 562 demo everywhere", async () => {
    mockLive("row12");
    await openSummaryAndView(12, 316721330);
    await screen.findByTestId("benchmark-banner");

    fireEvent.click(screen.getByRole("button", { name: "Back to demo scenario" }));
    expect(screen.queryByTestId("benchmark-banner")).toBeNull();
    expect(await screen.findByText(/Scenario \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();

    expect(await screen.findByText("Base (0,0)")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Nearest Neighbour (80m)" })).toBeInTheDocument();
    const opt = await screen.findByTestId("raid-score-optimal");
    await waitFor(() => expect(opt).toHaveTextContent("562 pts"));

    fireEvent.click(screen.getByRole("tab", { name: "Summary" }));
    expect(await screen.findAllByText("562")).not.toHaveLength(0);
    expect(screen.queryByTestId("repro-card")).toBeNull();
  });

  it("shows the fetch error inline in the row when the map cannot be loaded", async () => {
    mockLive("row1");
    api.benchmarkMap.mockImplementation(() => Promise.reject(new Error("GET /api/experiments/map failed (500)")));
    await openSummaryAndView(1, 1654615998);

    expect(await screen.findByRole("alert")).toHaveTextContent("GET /api/experiments/map failed (500)");
    expect(screen.queryByTestId("benchmark-banner")).toBeNull();
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
  });
});

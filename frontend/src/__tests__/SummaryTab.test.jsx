import React from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SummaryTab from "../tabs/SummaryTab.jsx";
import scenarioFixture from "@fixtures/scenario.json";
import experimentsFixture from "@fixtures/experiments.json";
import { api } from "../api.js";

describe("SummaryTab Component (Part 10)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders correctly from the fixture: total score 562, module gains (12.5%, 7.5%), and 20-map table", async () => {
    vi.spyOn(api, "experiments").mockResolvedValue(experimentsFixture);

    render(<SummaryTab scenario={scenarioFixture} />);

    // 1. Headline total score card: 562 (445 combat + 117 crafting)
    const scoreElements = await screen.findAllByText("562");
    expect(scoreElements.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Total Raid Score/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/445/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/117/i).length).toBeGreaterThan(0);

    // 2. Stage 2 Route: 80 -> 70, 12.5% gain
    const routeCard = screen.getByTestId("module-card-route");
    expect(routeCard).toBeInTheDocument();
    expect(within(routeCard).getAllByText(/12.5% Faster/i).length).toBeGreaterThan(0);
    expect(within(routeCard).getByText(/70 minutes/i)).toBeInTheDocument();
    expect(within(routeCard).getByText(/80 minutes/i)).toBeInTheDocument();

    // 3. Stage 3 Assignment: 414 -> 445, 7.5% gain
    const assignCard = screen.getByTestId("module-card-assignment");
    expect(assignCard).toBeInTheDocument();
    expect(within(assignCard).getAllByText(/\+7\.5% Score/i).length).toBeGreaterThan(0);
    expect(within(assignCard).getByText(/445 score/i)).toBeInTheDocument();
    expect(within(assignCard).getByText(/414 score/i)).toBeInTheDocument();

    // 4. Stage 4 Crafting: 111 -> 117
    const craftCard = screen.getByTestId("module-card-crafting");
    expect(craftCard).toBeInTheDocument();
    expect(within(craftCard).getByText(/117 score/i)).toBeInTheDocument();

    // 5. Whole Pipeline: shows naive as Infeasible and total as 562
    const pipeCard = screen.getByTestId("module-card-whole-pipeline");
    expect(pipeCard).toBeInTheDocument();
    expect(within(pipeCard).getByText(/Enables Feasibility/i)).toBeInTheDocument();
    expect(within(pipeCard).getAllByText(/Infeasible/i).length).toBeGreaterThan(0);

    // 6. 20-Map Monte Carlo simulation section
    expect(screen.getByTestId("benchmark-section")).toBeInTheDocument();
    expect(screen.getByText(/20-Map Random Experiment Benchmarks/i)).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /20-Map Monte Carlo Experiment Results/i })).toBeInTheDocument();
  });

  it("handles error state cleanly and displays error alert banner", async () => {
    vi.spyOn(api, "experiments").mockRejectedValue(new Error("Network connection lost"));

    render(<SummaryTab scenario={scenarioFixture} />);

    // Expect error alert with role="alert" from Status component
    const alert = await screen.findByRole("alert");
    expect(alert).toBeInTheDocument();
    expect(alert).toHaveTextContent(/Network connection lost/i);
    expect(screen.queryByTestId("summary-dashboard")).toBeNull();
  });

  it("toggles between Dashboard View and Report Export View", async () => {
    vi.spyOn(api, "experiments").mockResolvedValue(experimentsFixture);

    render(<SummaryTab scenario={scenarioFixture} />);

    // Initially in Dashboard View
    expect(await screen.findByTestId("summary-dashboard")).toBeInTheDocument();
    expect(screen.queryByTestId("report-export-view")).toBeNull();

    // Click Report Export button
    const exportBtn = screen.getByRole("button", { name: /Report Export/i });
    fireEvent.click(exportBtn);

    // Now Report Export View is rendered
    expect(await screen.findByTestId("report-export-view")).toBeInTheDocument();
    expect(screen.getByText(/Shadow Citadel Raid Optimization Report/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Copy Markdown/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print \/ Save PDF/i })).toBeInTheDocument();

    // Toggle back via Back button
    const backBtn = screen.getByRole("button", { name: /Back to Dashboard/i });
    fireEvent.click(backBtn);

    expect(await screen.findByTestId("summary-dashboard")).toBeInTheDocument();
  });

  it("filters the benchmark table by node count when clicking filter segments", async () => {
    vi.spyOn(api, "experiments").mockResolvedValue(experimentsFixture);

    render(<SummaryTab scenario={scenarioFixture} />);

    expect(await screen.findByTestId("benchmark-section")).toBeInTheDocument();

    // Click "8 Nodes" filter button
    const filter8Btn = screen.getByRole("button", { name: /^8 Nodes$/i });
    fireEvent.click(filter8Btn);
    expect(filter8Btn).toHaveClass("active");

    // Click "All" filter button
    const allBtn = screen.getByRole("button", { name: /All \(20\)/i });
    fireEvent.click(allBtn);
    expect(allBtn).toHaveClass("active");
  });

  it("gracefully displays a fallback card if random_maps is null or empty", async () => {
    const fixtureWithoutMaps = {
      status: "optimal",
      answer: {
        modules: experimentsFixture.answer.modules,
        random_maps: null,
      },
    };
    vi.spyOn(api, "experiments").mockResolvedValue(fixtureWithoutMaps);

    render(<SummaryTab scenario={scenarioFixture} />);

    const matches = await screen.findAllByText(/562/);
    expect(matches.length).toBeGreaterThan(0);
    expect(screen.getByText(/Monte Carlo experiment results are computed live by the backend/i)).toBeInTheDocument();
  });
});

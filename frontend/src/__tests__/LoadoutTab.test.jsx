import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadoutTab from "../tabs/LoadoutTab.jsx";
import { formatNum, formatSymbolic } from "../tabs/loadout/formatBigM.js";
import scenarioFixture from "@fixtures/scenario.json";

describe("formatBigM utility", () => {
  it("formats numbers nicely (integers as integers, floats rounded)", () => {
    expect(formatNum(14)).toBe("14");
    expect(formatNum(14.0)).toBe("14");
    expect(formatNum(0.75)).toBe("0.75");
    expect(formatNum(2.666667)).toBe("2.67");
    expect(formatNum(null)).toBe("-");
    expect(formatNum(undefined)).toBe("-");
  });

  it("formats Big-M symbolic expressions correctly", () => {
    expect(formatSymbolic(-6, -8)).toBe("-6M - 8");
    expect(formatSymbolic(1, 0)).toBe("M");
    expect(formatSymbolic(-1, 0)).toBe("-M");
    expect(formatSymbolic(1, -3)).toBe("M - 3");
    expect(formatSymbolic(1, 5)).toBe("M + 5");
    expect(formatSymbolic(0, 117)).toBe("117");
    expect(formatSymbolic(0, -8)).toBe("-8");
    expect(formatSymbolic(0, 0)).toBe("0");
    expect(formatSymbolic(0.333333, 0)).toBe("0.33M");
  });
});

describe("LoadoutTab Component (Part 9)", () => {
  it("renders optimal crafting solution by default from scenario", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    // Wait for the data to load and render optimal score
    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    // Score cards
    expect(screen.getByText("Crafting Bonus (Z)")).toBeInTheDocument();
    expect(screen.getByText("Combat Score")).toBeInTheDocument();
    expect(screen.getByText("Total Raid Score")).toBeInTheDocument();
    expect(screen.getByText("562")).toBeInTheDocument(); // 445 + 117

    // 4 Recipe Allocation Cards
    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("Health Potion");
    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("7");
    expect(screen.getByTestId("recipe-card-x2")).toHaveTextContent("Stamina Potion");
    expect(screen.getByTestId("recipe-card-x2")).toHaveTextContent("0");
    expect(screen.getByTestId("recipe-card-x3")).toHaveTextContent("Damage Elixir");
    expect(screen.getByTestId("recipe-card-x3")).toHaveTextContent("4");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("Shield Scroll");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("3");

    // Resource Consumption Meters
    expect(screen.getByTestId("meter-time")).toHaveTextContent("Crafting Time");
    expect(screen.getByTestId("meter-time")).toHaveTextContent("50 / 50 min");
    expect(screen.getByTestId("meter-time")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-weight")).toHaveTextContent("Carry Weight");
    expect(screen.getByTestId("meter-weight")).toHaveTextContent("40 / 40 kg");
    expect(screen.getByTestId("meter-weight")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-slots")).toHaveTextContent("Inventory Capacity");
    expect(screen.getByTestId("meter-slots")).toHaveTextContent("14 / 14 slots");
    expect(screen.getByTestId("meter-slots")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-stamina")).toHaveTextContent("Stamina Load");
    expect(screen.getByTestId("meter-stamina")).toHaveTextContent("33 pts Slack");

    expect(screen.getByTestId("meter-survival")).toHaveTextContent("Survival Points");
    expect(screen.getByTestId("meter-survival")).toHaveTextContent("+14 pts Surplus");

    // Bottleneck & Shadow Prices
    expect(screen.getByLabelText("Bottleneck Alert")).toHaveTextContent(
      "Crafting time is the bottleneck: each extra minute adds 0.75 score."
    );
    expect(screen.getByTestId("shadow-price-time")).toHaveTextContent("+0.75 pts / min");
    expect(screen.getByTestId("shadow-price-weight")).toHaveTextContent("+0.5 pts / kg");
    expect(screen.getByTestId("shadow-price-slots")).toHaveTextContent("+4.25 pts / slot");
  });

  it("renders simplex tableau stepper with pivot cell and symbolic Big-M display", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Simplex Tableau Grid")).toBeInTheDocument();
    });

    // Check step player header
    expect(screen.getByText("Iteration 0")).toBeInTheDocument();
    expect(screen.getByText(/x1 enters, a4 leaves/i)).toBeInTheDocument();

    // Pivot indicators
    expect(screen.getAllByText(/↓ x1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/← a4/).length).toBeGreaterThan(0);
    expect(screen.getByText("[Row 3, Col 0]")).toBeInTheDocument();

    // Check that pivot cell is highlighted
    const pivotCell = document.querySelector(".td-pivot-cell");
    expect(pivotCell).toBeInTheDocument();
    expect(pivotCell).toHaveTextContent("5");

    // Symbolic Big-M objective row entry
    expect(screen.getByText("-6M - 8")).toBeInTheDocument();
  });

  it("navigates tableaux steps using StepPlayer controls", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("Iteration 0")).toBeInTheDocument();
    });

    // Click Next button on StepPlayer
    const nextBtn = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(screen.getByText("Iteration 1")).toBeInTheDocument();
    });
  });

  it("handles Tight Boundary preset (42 min, Z=111)", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    // Click Boundary preset
    fireEvent.click(screen.getByTestId("preset-boundary"));

    await waitFor(() => {
      expect(screen.getByText("111")).toBeInTheDocument();
    });

    // Score: 111, Total: 556 (445 + 111)
    expect(screen.getByText("556")).toBeInTheDocument();

    // Allocation: (13, 0, 0, 1)
    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("13");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("1");
  });

  it("handles Naive Route Infeasible preset (40 min) with readable alert", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    // Click Infeasible preset
    fireEvent.click(screen.getByTestId("preset-infeasible"));

    await waitFor(() => {
      expect(screen.getByTestId("infeasible-card")).toBeInTheDocument();
    });

    expect(screen.getByText(/Crafting Plan Infeasible \(40 min available\)/i)).toBeInTheDocument();
    const infeasibleMessages = screen.getAllByText(
      /With 40 minutes of crafting time the 14-slot plan cannot meet the limits/i
    );
    expect(infeasibleMessages.length).toBeGreaterThan(0);

    // Replay stepper is still rendered and accessible in infeasible state!
    expect(screen.getByLabelText("Simplex Tableau Grid")).toBeInTheDocument();
  });

  it("switches to Two-Phase method and renders Phase 1 / Phase 2 trace", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    // Click Two-Phase button
    fireEvent.click(screen.getByTestId("method-twophase"));

    await waitFor(() => {
      expect(screen.getAllByText(/phase1/i).length).toBeGreaterThan(0);
    });
  });

  it("allows manual time slider adjustment and resetting to scenario time", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    const slider = screen.getByLabelText("Available Crafting Time Slider");
    fireEvent.change(slider, { target: { value: "42" } });

    await waitFor(() => {
      expect(screen.getByText("111")).toBeInTheDocument();
    });

    // Reset button should appear
    const resetBtn = screen.getByTestId("btn-reset-time");
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });
  });

  it("toggles tableaux display visibility with hide/show button", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Simplex Tableau Grid")).toBeInTheDocument();
    });

    const toggleBtn = screen.getByTestId("toggle-tableau-btn");
    expect(toggleBtn).toHaveTextContent("Hide Tableaux");

    fireEvent.click(toggleBtn);
    expect(screen.queryByLabelText("Simplex Tableau Grid")).not.toBeInTheDocument();
    expect(toggleBtn).toHaveTextContent("Show Tableaux");

    fireEvent.click(toggleBtn);
    expect(screen.getByLabelText("Simplex Tableau Grid")).toBeInTheDocument();
  });
});

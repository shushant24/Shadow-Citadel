import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import LoadoutTab from "../tabs/LoadoutTab.jsx";
import { formatNum, formatSymbolic } from "../tabs/loadout/formatBigM.js";
import scenarioFixture from "@fixtures/scenario.json";

describe("formatBigM utility", () => {
  it("formats plain numbers cleanly", () => {
    expect(formatNum(14)).toBe("14");
    expect(formatNum(14.0)).toBe("14");
    expect(formatNum(0.75)).toBe("0.75");
    expect(formatNum(2.666667)).toBe("2.67");
    expect(formatNum(null)).toBe("-");
    expect(formatNum(undefined)).toBe("-");
  });

  it("formats symbolic Big-M values correctly", () => {
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

describe("LoadoutTab Part 9", () => {
  it("renders the Loadout header and the main method controls", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    expect(screen.getByRole("heading", { level: 2, name: "Loadout" })).toBeInTheDocument();
    expect(screen.getByText("Stage 4: Consumable Crafting & Simplex LP Optimization")).toBeInTheDocument();
    expect(screen.getByTestId("method-bigm")).toBeInTheDocument();
    expect(screen.getByTestId("method-twophase")).toBeInTheDocument();
  });

  it("loads the optimal solution and displays score and allocation cards", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    expect(screen.getByText("Crafting Bonus (Z)")).toBeInTheDocument();
    expect(screen.getByText("Combat Score")).toBeInTheDocument();
    expect(screen.getByText("Total Raid Score")).toBeInTheDocument();
    expect(screen.getByText("562")).toBeInTheDocument();

    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("Health Potion");
    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("7");
    expect(screen.getByTestId("recipe-card-x2")).toHaveTextContent("Stamina Potion");
    expect(screen.getByTestId("recipe-card-x2")).toHaveTextContent("0");
    expect(screen.getByTestId("recipe-card-x3")).toHaveTextContent("Damage Elixir");
    expect(screen.getByTestId("recipe-card-x3")).toHaveTextContent("4");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("Shield Scroll");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("3");
  });

  it("shows the resource meters and expected binding values", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByTestId("meter-time")).toBeInTheDocument();
    });

    expect(screen.getByTestId("meter-time")).toHaveTextContent("Crafting Time");
    expect(screen.getByTestId("meter-time")).toHaveTextContent("50 / 50 min");
    expect(screen.getByTestId("meter-time")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-weight")).toHaveTextContent("Carry Weight");
    expect(screen.getByTestId("meter-weight")).toHaveTextContent("40 / 40 kg");
    expect(screen.getByTestId("meter-weight")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-slots")).toHaveTextContent("Inventory Capacity");
    expect(screen.getByTestId("meter-slots")).toHaveTextContent("14 / 14 slots");
    expect(screen.getByTestId("meter-slots")).toHaveTextContent("Binding");

    expect(screen.getByTestId("meter-stamina")).toHaveTextContent("33 pts Slack");
    expect(screen.getByTestId("meter-survival")).toHaveTextContent("+14 pts Surplus");
  });

  it("shows the bottleneck alert and shadow price interpretations", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Bottleneck Alert")).toBeInTheDocument();
    });

    expect(screen.getByLabelText("Bottleneck Alert")).toHaveTextContent(
      "Crafting time is the bottleneck: each extra minute adds 0.75 score."
    );

    expect(screen.getByTestId("shadow-price-time")).toHaveTextContent("+0.75 pts / min");
    expect(screen.getByTestId("shadow-price-time")).toHaveTextContent("+0.75 raid score per additional minute");

    expect(screen.getByTestId("shadow-price-weight")).toHaveTextContent("+0.5 pts / kg");
    expect(screen.getByTestId("shadow-price-weight")).toHaveTextContent("+0.5 raid score per additional kg");

    expect(screen.getByTestId("shadow-price-slots")).toHaveTextContent("+4.25 pts / slot");
    expect(screen.getByTestId("shadow-price-slots")).toHaveTextContent("+4.25 raid score per additional slot");
  });

  it("renders the tableau stepper and pivot details for the first iteration", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByLabelText("Simplex Tableau Grid")).toBeInTheDocument();
    });

    expect(screen.getByText("Iteration 0")).toBeInTheDocument();
    expect(screen.getAllByText(/↓ x1/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/← a4/).length).toBeGreaterThan(0);
    expect(screen.getByText("[Row 3, Col 0]")).toBeInTheDocument();

    const pivotCell = document.querySelector(".td-pivot-cell");
    expect(pivotCell).toBeInTheDocument();
    expect(pivotCell).toHaveTextContent("5");
    expect(screen.getByText("-6M - 8")).toBeInTheDocument();
  });

  it("supports preset switching between optimal and boundary states", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("preset-boundary"));

    await waitFor(() => {
      expect(screen.getByText("111")).toBeInTheDocument();
    });

    expect(screen.getByText("556")).toBeInTheDocument();
    expect(screen.getByTestId("recipe-card-x1")).toHaveTextContent("13");
    expect(screen.getByTestId("recipe-card-x4")).toHaveTextContent("1");
  });

  it("shows the infeasible explanation when crafting time is too low", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("preset-infeasible"));

    await waitFor(() => {
      expect(screen.getByTestId("infeasible-card")).toBeInTheDocument();
    });

    expect(screen.getByText(/Crafting Plan Infeasible \(40 min available\)/i)).toBeInTheDocument();
    expect(screen.getByText(/The inventory capacity constraint requires filling all 14 slots/i)).toBeInTheDocument();
    expect(screen.getByText(/Increase available crafting time to at least 42 minutes/i)).toBeInTheDocument();
  });

  it("allows changing the custom time slider and resetting it", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    const slider = screen.getByLabelText("Available Crafting Time Slider");
    fireEvent.change(slider, { target: { value: "42" } });

    await waitFor(() => {
      expect(screen.getByText("111")).toBeInTheDocument();
    });

    const resetBtn = screen.getByTestId("btn-reset-time");
    expect(resetBtn).toBeInTheDocument();

    fireEvent.click(resetBtn);
    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });
  });

  it("switches to the two-phase method and shows the phase trace", async () => {
    render(<LoadoutTab scenario={scenarioFixture} />);

    await waitFor(() => {
      expect(screen.getByText("117")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("method-twophase"));

    await waitFor(() => {
      expect(screen.getAllByText(/phase1/i).length).toBeGreaterThan(0);
    });
  });

  it("toggles the tableau view visibility", async () => {
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

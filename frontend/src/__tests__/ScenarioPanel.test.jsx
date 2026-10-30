import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScenarioPanel from "../components/ScenarioPanel.jsx";
import scenarioFixture from "@fixtures/scenario.json";

describe("ScenarioPanel component", () => {
  test("renders all scenario configuration sections and inputs", () => {
    render(<ScenarioPanel scenario={scenarioFixture} onChange={vi.fn()} />);

    expect(screen.getByText(/Scenario Configuration \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Raid Time Limit/i)).toHaveValue(120);

    expect(screen.getByLabelText(/Max Weight/i)).toHaveValue(40);
    expect(screen.getByLabelText(/Max Stamina/i)).toHaveValue(90);
    expect(screen.getByLabelText(/Min Survival/i)).toHaveValue(30);
    expect(screen.getByLabelText(/Required Slots/i)).toHaveValue(14);

    expect(screen.getByText("x1 Health potion")).toBeInTheDocument();
    expect(screen.getByText("x2 Stamina potion")).toBeInTheDocument();
    expect(screen.getByText("x3 Damage elixir")).toBeInTheDocument();
    expect(screen.getByText("x4 Shield scroll")).toBeInTheDocument();
  });

  test("editing raid time limit calls onChange with updated total_time", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const timeInput = screen.getByLabelText(/Raid Time Limit/i);
    fireEvent.change(timeInput, { target: { value: "110" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.total_time).toBe(110);
    expect(updated.nodes).toEqual(scenarioFixture.nodes);
  });

  test("editing limits calls onChange with updated limits", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const weightInput = screen.getByLabelText(/Max Weight/i);
    fireEvent.change(weightInput, { target: { value: "45" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.limits.weight).toBe(45);
    expect(updated.limits.stamina).toBe(90);
  });

  test("editing a recipe cell calls onChange with updated recipe matrix", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const healthScoreInput = screen.getByLabelText("x1 Health potion Score / unit");
    fireEvent.change(healthScoreInput, { target: { value: "12" } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.recipes.score[0]).toBe(12);
    expect(updated.recipes.score[1]).toBe(scenarioFixture.recipes.score[1]);
  });

  test("reset button calls onReset when modified", () => {
    const handleReset = vi.fn();
    render(
      <ScenarioPanel
        scenario={scenarioFixture}
        onChange={vi.fn()}
        onReset={handleReset}
        isEdited={true}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /Reset to Defaults/i });
    expect(resetBtn).not.toBeDisabled();
    fireEvent.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });

  test("toggle raw JSON button reveals JSON dump", () => {
    render(<ScenarioPanel scenario={scenarioFixture} onChange={vi.fn()} />);

    expect(screen.queryByTestId("scenario-json-dump")).toBeNull();
    const toggleBtn = screen.getByRole("button", { name: /Show Raw JSON/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByTestId("scenario-json-dump")).toBeInTheDocument();
  });
});

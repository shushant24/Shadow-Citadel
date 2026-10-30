import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import ScenarioPanel from "../components/ScenarioPanel.jsx";
import scenarioFixture from "@fixtures/scenario.json";

describe("ScenarioPanel component", () => {
  test("renders all scenario configuration sections and inputs", () => {
    render(<ScenarioPanel scenario={scenarioFixture} onChange={vi.fn()} />);

    expect(screen.getByText(/Scenario \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();
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

  test("returns null when scenario is null", () => {
    const { container } = render(<ScenarioPanel scenario={null} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  test("re-rendering from scenario=null to scenario=fixture does not violate rules of hooks", () => {
    const { container, rerender } = render(<ScenarioPanel scenario={null} onChange={vi.fn()} />);
    expect(container.firstChild).toBeNull();

    // Rerender with valid scenario — must not throw "Rendered more hooks" error
    rerender(<ScenarioPanel scenario={scenarioFixture} onChange={vi.fn()} />);
    expect(screen.getByText(/Scenario \(8 nodes, 4 loot drops\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Raid Time Limit/i)).toHaveValue(120);
  });

  test("editing raid time limit calls onChange on blur and preserves nodes, loot, and weapon scores", () => {
    const handleChange = vi.fn();
    const clonedFixture = structuredClone(scenarioFixture);
    render(<ScenarioPanel scenario={clonedFixture} onChange={handleChange} />);

    const timeInput = screen.getByLabelText(/Raid Time Limit/i);

    // Type freely (draft updates, onChange not called yet)
    fireEvent.change(timeInput, { target: { value: "110" } });
    expect(handleChange).not.toHaveBeenCalled();

    // Blur commits the value
    fireEvent.blur(timeInput);

    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.total_time).toBe(110);
    expect(updated.nodes).toEqual(scenarioFixture.nodes);
    expect(updated.loot).toEqual(scenarioFixture.loot);
    expect(updated.weapon_boss_scores).toEqual(scenarioFixture.weapon_boss_scores);

    // Verify defensive immutability: original fixture untouched
    expect(clonedFixture.total_time).toBe(120);
  });

  test("rejects invalid, negative, or empty input on blur without calling onChange", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const timeInput = screen.getByLabelText(/Raid Time Limit/i);

    // Empty input typed, then blur → reverts to 120, no onChange
    fireEvent.change(timeInput, { target: { value: "" } });
    fireEvent.blur(timeInput);
    expect(handleChange).not.toHaveBeenCalled();

    // Negative input typed, then blur → reverts, no onChange
    fireEvent.change(timeInput, { target: { value: "-10" } });
    fireEvent.blur(timeInput);
    expect(handleChange).not.toHaveBeenCalled();

    // Zero input for total_time (min is 1)
    fireEvent.change(timeInput, { target: { value: "0" } });
    fireEvent.blur(timeInput);
    expect(handleChange).not.toHaveBeenCalled();

    // Non-numeric string
    fireEvent.change(timeInput, { target: { value: "abc" } });
    fireEvent.blur(timeInput);
    expect(handleChange).not.toHaveBeenCalled();
  });

  test("editing limits calls onChange with updated limits on blur", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const weightInput = screen.getByLabelText(/Max Weight/i);
    fireEvent.change(weightInput, { target: { value: "45" } });
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.blur(weightInput);
    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.limits.weight).toBe(45);
    expect(updated.limits.stamina).toBe(90);
  });

  test("editing a recipe cell calls onChange with updated recipe matrix on Enter (single commit)", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const healthScoreInput = screen.getByLabelText("x1 Health potion Score / unit");
    healthScoreInput.focus();
    fireEvent.change(healthScoreInput, { target: { value: "12" } });
    expect(handleChange).not.toHaveBeenCalled();

    fireEvent.keyDown(healthScoreInput, { key: "Enter" });
    expect(handleChange).toHaveBeenCalledTimes(1);
    const updated = handleChange.mock.calls[0][0];
    expect(updated.recipes.score[0]).toBe(12);
    expect(updated.recipes.score[1]).toBe(scenarioFixture.recipes.score[1]);
  });

  test("limits revert invalid or empty inputs on blur without calling onChange", () => {
    const handleChange = vi.fn();
    render(<ScenarioPanel scenario={scenarioFixture} onChange={handleChange} />);

    const staminaInput = screen.getByLabelText(/Max Stamina/i);

    // Empty input typed, then blur → reverts, no onChange
    fireEvent.change(staminaInput, { target: { value: "" } });
    fireEvent.blur(staminaInput);
    expect(handleChange).not.toHaveBeenCalled();
    expect(staminaInput).toHaveValue(90);

    // Negative input typed, then blur → reverts, no onChange
    fireEvent.change(staminaInput, { target: { value: "-5" } });
    fireEvent.blur(staminaInput);
    expect(handleChange).not.toHaveBeenCalled();
    expect(staminaInput).toHaveValue(90);
  });

  test("missing recipe cell renders as empty input rather than defaulting to 0", () => {
    const sparseScenario = {
      ...scenarioFixture,
      recipes: {
        ...scenarioFixture.recipes,
        score: [undefined, 6, 10, 7],
      },
    };
    render(<ScenarioPanel scenario={sparseScenario} onChange={vi.fn()} />);
    const healthScoreInput = screen.getByLabelText("x1 Health potion Score / unit");
    expect(healthScoreInput.value).toBe("");
  });

  test("reset button is disabled when not edited, and calls onReset when modified", () => {
    const handleReset = vi.fn();
    const { rerender } = render(
      <ScenarioPanel
        scenario={scenarioFixture}
        onChange={vi.fn()}
        onReset={handleReset}
        isEdited={false}
      />
    );

    const resetBtn = screen.getByRole("button", { name: /Reset to Defaults/i });
    expect(resetBtn).toBeDisabled();

    // Rerender as modified
    rerender(
      <ScenarioPanel
        scenario={scenarioFixture}
        onChange={vi.fn()}
        onReset={handleReset}
        isEdited={true}
      />
    );

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

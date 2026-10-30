import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StepPlayer from "../components/StepPlayer.jsx";

const steps = [
  { n: 1, note: "First step note", phase: "init" },
  { n: 2, note: "Second step note", phase: "reduce" },
  { n: 3, note: "Final step note", phase: "final" },
];

describe("StepPlayer component", () => {
  test("Next, Back, First and Last move through the steps", () => {
    render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);

    expect(screen.getByText("step value 1")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 3")).toBeInTheDocument();

    // Next
    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("step value 2")).toBeInTheDocument();

    // Last
    fireEvent.click(screen.getByLabelText("Last step"));
    expect(screen.getByText("step value 3")).toBeInTheDocument();
    expect(screen.getByText("Next")).toBeDisabled();

    // Back
    fireEvent.click(screen.getByText("Back"));
    expect(screen.getByText("step value 2")).toBeInTheDocument();

    // First
    fireEvent.click(screen.getByLabelText("First step"));
    expect(screen.getByText("step value 1")).toBeInTheDocument();
    expect(screen.getByText("Back")).toBeDisabled();
  });

  test("scrubber range slider navigates to specific step", () => {
    render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);

    const scrubber = screen.getByLabelText("Step progress slider");
    fireEvent.change(scrubber, { target: { value: "2" } });

    expect(screen.getByText("step value 3")).toBeInTheDocument();
    expect(screen.getByText("Step 3 of 3")).toBeInTheDocument();
  });

  test("auto-plays steps and pauses when reaching the end", () => {
    vi.useFakeTimers();
    render(
      <StepPlayer steps={steps} initialSpeedMs={200}>
        {(s) => <p>step value {s.n}</p>}
      </StepPlayer>
    );

    const playBtn = screen.getByText("Play");
    fireEvent.click(playBtn);
    expect(screen.getByText("Pause")).toBeInTheDocument();

    // Advance by 200ms -> step 2
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("step value 2")).toBeInTheDocument();

    // Advance by 200ms -> step 3 (last step)
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(screen.getByText("step value 3")).toBeInTheDocument();

    // When last step is reached, playback auto-pauses
    expect(screen.getByText("Play")).toBeInTheDocument();
    vi.useRealTimers();
  });

  test("shows metadata banner with note and phase", () => {
    render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);

    expect(screen.getByText("First step note")).toBeInTheDocument();
    expect(screen.getByText("init")).toBeInTheDocument();
  });

  test("shows a message when there are no steps", () => {
    render(<StepPlayer steps={[]} />);
    expect(screen.getByText(/No steps/)).toBeInTheDocument();
  });

  test("single step array disables navigation controls", () => {
    render(<StepPlayer steps={[{ n: 1 }]}>{(s) => <p>only step {s.n}</p>}</StepPlayer>);

    expect(screen.getByText("Back")).toBeDisabled();
    expect(screen.getByText("Next")).toBeDisabled();
    expect(screen.getByText("Play")).toBeDisabled();
    expect(screen.getByLabelText("Step progress slider")).toBeDisabled();
  });

  test("resetting steps prop resets playback to step 1", () => {
    const { rerender } = render(
      <StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>
    );

    fireEvent.click(screen.getByText("Next"));
    expect(screen.getByText("step value 2")).toBeInTheDocument();

    // Re-render with new steps array
    const newSteps = [{ n: 10 }, { n: 20 }];
    rerender(
      <StepPlayer steps={newSteps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>
    );

    expect(screen.getByText("step value 10")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 2")).toBeInTheDocument();
  });
});

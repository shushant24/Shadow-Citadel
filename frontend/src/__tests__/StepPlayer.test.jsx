import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import StepPlayer from "../components/StepPlayer.jsx";

const steps = [
  { n: 1, note: "First step note", phase: "init" },
  { n: 2, note: "Second step note", phase: "reduce" },
  { n: 3, note: "Final step note", phase: "final" },
];

describe("StepPlayer component", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

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
  });

  test("clicking Play at the final step restarts from step 1", () => {
    vi.useFakeTimers();
    render(
      <StepPlayer steps={steps} initialSpeedMs={200}>
        {(s) => <p>step value {s.n}</p>}
      </StepPlayer>
    );

    // Jump to last step
    fireEvent.click(screen.getByLabelText("Last step"));
    expect(screen.getByText("step value 3")).toBeInTheDocument();

    // Click Play -> should reset to 0 and begin playing
    fireEvent.click(screen.getByText("Play"));
    expect(screen.getByText("Pause")).toBeInTheDocument();
    expect(screen.getByText("step value 1")).toBeInTheDocument();
  });

  test("shrinking steps prop safely clamps index without rendering undefined", () => {
    const longSteps = Array.from({ length: 20 }, (_, i) => ({ n: i + 1 }));
    let receivedStep = null;

    const { rerender } = render(
      <StepPlayer steps={longSteps}>
        {(s) => {
          receivedStep = s;
          return <p>step value {s.n}</p>;
        }}
      </StepPlayer>
    );

    // Scrub to step 16 (index 15)
    const scrubber = screen.getByLabelText("Step progress slider");
    fireEvent.change(scrubber, { target: { value: "15" } });
    expect(screen.getByText("step value 16")).toBeInTheDocument();

    // Now shrink the list to only 3 items
    const shortSteps = [{ n: 100 }, { n: 200 }, { n: 300 }];
    expect(() => {
      rerender(
        <StepPlayer steps={shortSteps}>
          {(s) => {
            receivedStep = s;
            return <p>step value {s.n}</p>;
          }}
        </StepPlayer>
      );
    }).not.toThrow();

    expect(receivedStep).not.toBeUndefined();
    expect(receivedStep.n).toBe(100);
    expect(screen.getByText("step value 100")).toBeInTheDocument();
  });

  test("keyboard navigation: ArrowRight, ArrowLeft, and Space", () => {
    render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);
    const playerRegion = screen.getByRole("region", { name: "Step Player" });

    // ArrowRight -> step 2
    fireEvent.keyDown(playerRegion, { key: "ArrowRight" });
    expect(screen.getByText("step value 2")).toBeInTheDocument();

    // ArrowLeft -> step 1
    fireEvent.keyDown(playerRegion, { key: "ArrowLeft" });
    expect(screen.getByText("step value 1")).toBeInTheDocument();

    // Space -> toggles play
    fireEvent.keyDown(playerRegion, { key: " " });
    expect(screen.getByText("Pause")).toBeInTheDocument();

    // Modifiers like Alt+ArrowRight are ignored
    fireEvent.keyDown(playerRegion, { key: "ArrowRight", altKey: true });
    // Still playing, index didn't advance from alt
    expect(screen.getByText("Pause")).toBeInTheDocument();
  });

  test("custom speed input allows free typing and clamps on blur", () => {
    render(<StepPlayer steps={steps}>{(s) => <p>step value {s.n}</p>}</StepPlayer>);

    const speedInput = screen.getByTitle("Speed in milliseconds (100 - 5000)");

    // Type freely
    fireEvent.change(speedInput, { target: { value: "1200" } });
    expect(speedInput).toHaveValue(1200);

    // Blur to commit
    fireEvent.blur(speedInput);
    expect(speedInput).toHaveValue(1200);

    // Preset button updates speed
    fireEvent.click(screen.getByText("Fast"));
    expect(speedInput).toHaveValue(300);

    // Excessively high speed clamps to 5000 on blur
    fireEvent.change(speedInput, { target: { value: "99999" } });
    fireEvent.blur(speedInput);
    expect(speedInput).toHaveValue(5000);
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
});

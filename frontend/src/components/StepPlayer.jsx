import React, { useEffect, useState } from "react";

/**
 * Reusable step player (Part 6): Back / Next / Play / speed over an ordered `steps` list.
 * Usage:  <StepPlayer steps={result.steps}>{(step, index) => <MyView step={step} />}</StepPlayer>
 */
export default function StepPlayer({ steps = [], children, initialSpeedMs = 800 }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const last = steps.length - 1;

  useEffect(() => { setIndex(0); setPlaying(false); }, [steps]);

  useEffect(() => {
    if (!playing) return undefined;
    if (index >= last) { setPlaying(false); return undefined; }
    const id = setTimeout(() => setIndex((i) => Math.min(i + 1, last)), speedMs);
    return () => clearTimeout(id);
  }, [playing, index, last, speedMs]);

  if (steps.length === 0) return <p className="todo">No steps to replay.</p>;

  return (
    <div>
      <div role="group" aria-label="step controls">
        <button onClick={() => setIndex((i) => Math.max(i - 1, 0))} disabled={index === 0}>Back</button>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
        <button onClick={() => setIndex((i) => Math.min(i + 1, last))} disabled={index === last}>Next</button>
        <label>
          Speed (ms){" "}
          <input type="number" min="100" step="100" value={speedMs}
                 onChange={(e) => setSpeedMs(Number(e.target.value) || initialSpeedMs)} />
        </label>
        <span> Step {index + 1} / {steps.length}</span>
      </div>
      {children?.(steps[index], index)}
    </div>
  );
}

import React, { useEffect, useState, useCallback } from "react";

const SPEED_PRESETS = [
  { label: "Fast", ms: 300 },
  { label: "Normal", ms: 800 },
  { label: "Slow", ms: 1500 },
];

/**
 * Reusable step player (Part 6): Back / Next / Play / speed / timeline scrubber over an ordered `steps` list.
 * Supports Branch & Bound trees, Hungarian method phases, Simplex tableaux, etc.
 * 
 * Usage:
 *   <StepPlayer steps={result.steps}>
 *     {(step, index) => <MyStepView step={step} index={index} />}
 *   </StepPlayer>
 */
export default function StepPlayer({
  steps = [],
  children,
  initialSpeedMs = 800,
  showScrubber = true,
  showNote = true,
  className = "",
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);

  const totalSteps = steps.length;
  const last = Math.max(0, totalSteps - 1);
  const hasMultipleSteps = totalSteps > 1;

  // Reset playback when steps list identity changes
  useEffect(() => {
    setIndex(0);
    setPlaying(false);
  }, [steps]);

  // Handle auto-play timer loop
  useEffect(() => {
    if (!playing) return undefined;
    if (index >= last) {
      setPlaying(false);
      return undefined;
    }
    const timerId = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, last));
    }, speedMs);
    return () => clearTimeout(timerId);
  }, [playing, index, last, speedMs]);

  const handleFirst = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  const handlePrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!hasMultipleSteps) return;
    if (index >= last) {
      // Loop back to start if playing from the end
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [hasMultipleSteps, index, last]);

  const handleNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, last));
  }, [last]);

  const handleLast = useCallback(() => {
    setIndex(last);
    setPlaying(false);
  }, [last]);

  // Keyboard navigation support
  const handleKeyDown = useCallback(
    (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === "Home") {
        e.preventDefault();
        handleFirst();
      } else if (e.key === "End") {
        e.preventDefault();
        handleLast();
      }
    },
    [handlePrev, handleNext, handleTogglePlay, handleFirst, handleLast]
  );

  if (totalSteps === 0) {
    return <p className="todo">No steps to replay.</p>;
  }

  const currentStep = steps[index];
  const stepNote = currentStep?.note;
  const stepPhase = currentStep?.phase;
  const stepStatus = currentStep?.status;

  return (
    <div
      className={`step-player ${className}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Step Player"
    >
      {/* Player Navigation Controls */}
      <div className="step-controls" role="group" aria-label="Step playback controls">
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleFirst}
            disabled={index === 0}
            title="First step (Home)"
            aria-label="First step"
          >
            &#124;&lt;
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrev}
            disabled={index === 0}
            title="Previous step (Left Arrow)"
          >
            Back
          </button>
          <button
            type="button"
            className={`btn ${playing ? "btn-warn" : "btn-primary"}`}
            onClick={handleTogglePlay}
            disabled={!hasMultipleSteps}
            title={playing ? "Pause (Space)" : "Play (Space)"}
          >
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleNext}
            disabled={index === last}
            title="Next step (Right Arrow)"
          >
            Next
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLast}
            disabled={index === last}
            title="Last step (End)"
            aria-label="Last step"
          >
            &gt;&#124;
          </button>
        </div>

        <span className="step-counter" aria-live="polite">
          Step {index + 1} of {totalSteps}
        </span>

        {/* Speed Controls */}
        <div className="speed-control">
          <span className="speed-label">Speed:</span>
          <div className="btn-group speed-presets">
            {SPEED_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`btn btn-xs ${speedMs === p.ms ? "btn-active" : "btn-secondary"}`}
                onClick={() => setSpeedMs(p.ms)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <label className="speed-custom" htmlFor="player-speed-input">
            <input
              id="player-speed-input"
              type="number"
              min="100"
              max="5000"
              step="100"
              value={speedMs}
              onChange={(e) => setSpeedMs(Math.max(100, Number(e.target.value) || initialSpeedMs))}
              className="form-input num-input-sm"
              title="Speed in milliseconds"
            />
            <span className="unit">ms</span>
          </label>
        </div>
      </div>

      {/* Timeline Scrubber */}
      {showScrubber && (
        <div className="scrubber-container">
          <input
            type="range"
            min="0"
            max={last}
            value={index}
            onChange={(e) => setIndex(Number(e.target.value))}
            disabled={!hasMultipleSteps}
            className="step-scrubber"
            aria-label="Step progress slider"
          />
        </div>
      )}

      {/* Optional Step Metadata Banner */}
      {showNote && (stepNote || stepPhase || stepStatus) && (
        <div className="step-note-banner" role="status">
          {stepPhase && <span className="badge badge-accent">{stepPhase}</span>}
          {stepStatus && <span className="badge badge-muted">{stepStatus}</span>}
          {stepNote && <span className="step-note-text">{stepNote}</span>}
        </div>
      )}

      {/* Render Active Step Content */}
      <div className="step-view" data-testid="step-content">
        {children?.(currentStep, index)}
      </div>
    </div>
  );
}

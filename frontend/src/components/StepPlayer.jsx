import React, { useEffect, useState, useCallback, useRef } from "react";

// Stable empty array to avoid infinite re-render loops when steps prop is omitted.
// A default `steps = []` in the destructuring creates a new array identity on every
// render, which the render-phase identity check sees as a change, causing setState loops.
const EMPTY_STEPS = [];

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
  steps = EMPTY_STEPS,
  children,
  initialSpeedMs = 800,
  showScrubber = true,
  showNote = true,
  className = "",
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(initialSpeedMs);
  const [speedDraft, setSpeedDraft] = useState(String(initialSpeedMs));
  const controlsRef = useRef(null);

  const totalSteps = Array.isArray(steps) ? steps.length : 0;
  const last = Math.max(0, totalSteps - 1);
  const hasMultipleSteps = totalSteps > 1;

  // Track steps identity to reset playback safely during render
  const [prevSteps, setPrevSteps] = useState(steps);
  let currentIndex = index;
  if (steps !== prevSteps) {
    setPrevSteps(steps);
    setIndex(0);
    setPlaying(false);
    currentIndex = 0;
  }

  // Guard against out-of-bounds index if steps array shrinks
  const safeIndex = totalSteps === 0 ? 0 : Math.min(Math.max(0, currentIndex), last);
  if (index !== safeIndex && totalSteps > 0 && steps === prevSteps) {
    setIndex(safeIndex);
  }

  // Keep draft speed in sync when speedMs is updated via presets
  useEffect(() => {
    setSpeedDraft(String(speedMs));
  }, [speedMs]);

  // Handle auto-play timer loop
  useEffect(() => {
    if (!playing) return undefined;
    if (safeIndex >= last) {
      setPlaying(false);
      return undefined;
    }
    const timerId = setTimeout(() => {
      setIndex((i) => Math.min(i + 1, last));
    }, speedMs);
    return () => clearTimeout(timerId);
  }, [playing, safeIndex, last, speedMs]);

  const handleFirst = useCallback(() => {
    setIndex(0);
    setPlaying(false);
  }, []);

  const handlePrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleTogglePlay = useCallback(() => {
    if (!hasMultipleSteps) return;
    if (safeIndex >= last) {
      // Loop back to start if playing from the end
      setIndex(0);
      setPlaying(true);
    } else {
      setPlaying((p) => !p);
    }
  }, [hasMultipleSteps, safeIndex, last]);

  const handleNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, last));
  }, [last]);

  const handleLast = useCallback(() => {
    setIndex(last);
    setPlaying(false);
  }, [last]);

  // Keyboard navigation: scoped to player, ignores modifier keys and interactive children
  const handleKeyDown = useCallback(
    (e) => {
      // Don't intercept if modifier keys are pressed (e.g. Cmd+Left, Alt+Left)
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

      // Don't intercept if event originated inside interactive inputs/buttons
      const target = e.target;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable ||
        (target.tagName === "BUTTON" && (e.key === " " || e.code === "Space"))
      ) {
        return;
      }

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

  const handleSpeedCommit = useCallback(() => {
    const val = parseInt(speedDraft, 10);
    if (!isNaN(val) && Number.isFinite(val)) {
      const clamped = Math.max(100, Math.min(5000, val));
      setSpeedMs(clamped);
      setSpeedDraft(String(clamped));
    } else {
      setSpeedDraft(String(speedMs));
    }
  }, [speedDraft, speedMs]);

  if (totalSteps === 0) {
    return <p className="todo">No steps to replay.</p>;
  }

  const currentStep = steps[safeIndex];
  const stepNote = currentStep?.note;
  const stepPhase = currentStep?.phase;
  const stepStatus = currentStep?.status;

  return (
    <div
      className={`step-player ${className}`}
      onKeyDown={handleKeyDown}
      role="region"
      aria-label="Step Player"
    >
      {/* Player Navigation Controls */}
      <div
        ref={controlsRef}
        className="step-controls"
        role="group"
        aria-label="Step playback controls"
        tabIndex={0}
      >
        <div className="btn-group">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleFirst}
            disabled={safeIndex === 0}
            title="First step (Home)"
            aria-label="First step"
          >
            &#124;&lt;
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handlePrev}
            disabled={safeIndex === 0}
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
            disabled={safeIndex === last}
            title="Next step (Right Arrow)"
          >
            Next
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleLast}
            disabled={safeIndex === last}
            title="Last step (End)"
            aria-label="Last step"
          >
            &gt;&#124;
          </button>
        </div>

        <span className="step-counter" aria-live="polite">
          Step {safeIndex + 1} of {totalSteps}
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
                onClick={() => {
                  setSpeedMs(p.ms);
                  setSpeedDraft(String(p.ms));
                }}
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
              value={speedDraft}
              onChange={(e) => setSpeedDraft(e.target.value)}
              onBlur={handleSpeedCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSpeedCommit();
                }
              }}
              className="form-input num-input-sm"
              title="Speed in milliseconds (100 - 5000)"
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
            value={safeIndex}
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
        {children?.(currentStep, safeIndex)}
      </div>
    </div>
  );
}

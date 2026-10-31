import React, { useState, useEffect, useRef } from 'react';

/**
 * Shared StepPlayer component (Part 6 contract)
 * Can be plugged into any tab with an array of steps.
 * 
 * Props:
 * - steps: Array of step objects
 * - currentStep: Current step index (0-based)
 * - onStepChange: Callback(newIndex)
 * - disabled: Boolean
 * - title: Optional string label
 */
export default function StepPlayer({
  steps = [],
  currentStep = 0,
  onStepChange,
  disabled = false,
  title = "Trace Stepper"
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1200); // ms per step
  const timerRef = useRef(null);

  const totalSteps = steps.length;
  const canGoPrev = currentStep > 0 && !disabled;
  const canGoNext = currentStep < totalSteps - 1 && !disabled;

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        onStepChange((prev) => {
          if (prev < totalSteps - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, speed);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, totalSteps, onStepChange]);

  const handleFirst = () => {
    setIsPlaying(false);
    onStepChange(0);
  };

  const handlePrev = () => {
    setIsPlaying(false);
    if (canGoPrev) onStepChange(currentStep - 1);
  };

  const handlePlayPause = () => {
    if (disabled || totalSteps <= 1) return;
    if (currentStep >= totalSteps - 1) {
      onStepChange(0);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNext = () => {
    setIsPlaying(false);
    if (canGoNext) onStepChange(currentStep + 1);
  };

  const handleLast = () => {
    setIsPlaying(false);
    onStepChange(totalSteps - 1);
  };

  if (totalSteps === 0) {
    return (
      <div style={styles.container}>
        <span style={styles.emptyText}>No trace steps available.</span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.metaRow}>
        <span style={styles.title}>{title}</span>
        <span style={styles.stepBadge}>
          Step {currentStep + 1} of {totalSteps}
        </span>
      </div>

      <div style={styles.controlsRow}>
        <button
          style={{ ...styles.btn, opacity: canGoPrev ? 1 : 0.4 }}
          onClick={handleFirst}
          disabled={!canGoPrev}
          title="First Step"
        >
          ⏮ First
        </button>
        <button
          style={{ ...styles.btn, opacity: canGoPrev ? 1 : 0.4 }}
          onClick={handlePrev}
          disabled={!canGoPrev}
          title="Previous Step"
        >
          ◀ Prev
        </button>
        <button
          style={{ ...styles.btn, ...styles.playBtn }}
          onClick={handlePlayPause}
          disabled={disabled}
          title={isPlaying ? "Pause" : "Auto Play"}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
        <button
          style={{ ...styles.btn, opacity: canGoNext ? 1 : 0.4 }}
          onClick={handleNext}
          disabled={!canGoNext}
          title="Next Step"
        >
          Next ▶
        </button>
        <button
          style={{ ...styles.btn, opacity: canGoNext ? 1 : 0.4 }}
          onClick={handleLast}
          disabled={!canGoNext}
          title="Final Step"
        >
          Last ⏭
        </button>

        <div style={styles.speedSelector}>
          <label style={styles.speedLabel}>Speed:</label>
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            style={styles.select}
          >
            <option value={2000}>0.5x</option>
            <option value={1200}>1.0x</option>
            <option value={600}>2.0x</option>
          </select>
        </div>
      </div>

      <div style={styles.progressTrack}>
        <div
          style={{
            ...styles.progressBar,
            width: `${((currentStep + 1) / totalSteps) * 100}%`
          }}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    backgroundColor: '#1a1f2c',
    border: '1px solid #2e384d',
    borderRadius: '8px',
    padding: '12px 16px',
    margin: '12px 0',
    color: '#e2e8f0',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)'
  },
  metaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  title: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  stepBadge: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    fontSize: '0.8rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '12px'
  },
  controlsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '10px'
  },
  btn: {
    backgroundColor: '#334155',
    color: '#f8fafc',
    border: '1px solid #475569',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '0.85rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s ease'
  },
  playBtn: {
    backgroundColor: '#0284c7',
    borderColor: '#38bdf8'
  },
  speedSelector: {
    marginLeft: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  speedLabel: {
    fontSize: '0.8rem',
    color: '#94a3b8'
  },
  select: {
    backgroundColor: '#1e293b',
    color: '#f1f5f9',
    border: '1px solid #475569',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '0.8rem'
  },
  progressTrack: {
    height: '4px',
    backgroundColor: '#334155',
    borderRadius: '2px',
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#38bdf8',
    transition: 'width 0.2s ease'
  },
  emptyText: {
    color: '#64748b',
    fontSize: '0.85rem',
    fontStyle: 'italic'
  }
};

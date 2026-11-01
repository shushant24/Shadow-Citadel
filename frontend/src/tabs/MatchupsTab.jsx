// MatchupsTab.jsx — Main Matchups tab component for Shadow Citadel.
// Features: Result-first design, Shadow Citadel RPG Raid HUD,
// integrated with Part 6 StepPlayer, App Shell, and Part 3 Hungarian solver.

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { solveAssign } from './matchups/matchupsApi';
import { normalizeAssign } from './matchups/normalizeAssign';
import ResultPanel from './matchups/ResultPanel';
import ScoreGrid, { DEFAULT_5x5, PRESETS } from './matchups/ScoreGrid';
import StepsView from './matchups/StepsView';
import { USE_FIXTURES } from '../api.js';

export default function MatchupsTab({ scenario, scores: externalScores, onScoresChange }) {
  const initialScores = externalScores ?? scenario?.weapon_boss_scores ?? DEFAULT_5x5;

  const [result, setResult]             = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const [showSteps, setShowSteps]       = useState(false);
  const [lastScores, setLastScores]     = useState(null);
  const [lastMaximize, setLastMaximize] = useState(true);

  // Invalidate in-flight async requests when inputs change
  const activeReqIdRef = useRef(0);
  const stepsRef = useRef(null);

  const isFixtureMode = USE_FIXTURES;

  const handleSolve = useCallback(async ({ scores, maximize }) => {
    const reqId = ++activeReqIdRef.current;
    setLoading(true);
    setError(null);
    setResult(null);
    setShowSteps(false);
    setLastScores(scores);
    setLastMaximize(maximize);

    if (onScoresChange) onScoresChange(scores);

    try {
      const raw = await solveAssign({ scores, maximize });
      if (reqId !== activeReqIdRef.current) return;

      if (raw.status !== 'optimal') {
        setError(`Solver returned: ${raw.status}. Check your input values.`);
        return;
      }

      const originalRows = scores.length;
      const originalCols = scores[0].length;
      const normalized = normalizeAssign(raw, originalRows, originalCols);
      setResult({ ...normalized, originalRows, originalCols });
    } catch (err) {
      if (reqId !== activeReqIdRef.current) return;
      setError(`Failed to solve: ${err.message}. Check your connection or try again.`);
    } finally {
      if (reqId === activeReqIdRef.current) {
        setLoading(false);
      }
    }
  }, [onScoresChange]);

  // Nothing is solved on open. When the scenario's scores change, drop any old result and wait for Solve.
  useEffect(() => {
    activeReqIdRef.current++;
    setResult(null);
    setError(null);
    setLoading(false);
    setShowSteps(false);
  }, [scenario?.weapon_boss_scores]);

  function handleGridEdit() {
    activeReqIdRef.current++;
    setResult(null);
    setError(null);
    setLoading(false);
  }

  // When the replay opens below the result on a narrow screen, bring it into view.
  useEffect(() => {
    if (showSteps && typeof stepsRef.current?.scrollIntoView === 'function') {
      stepsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [showSteps]);

  function toggleSteps() {
    setShowSteps((prev) => !prev);
  }

  // Demo banner appears only when scores deviate from all known presets (matrix AND maximize mode)
  const matchesKnownPreset =
    lastScores === null ||
    Object.values(PRESETS).some(
      (p) => JSON.stringify(p.matrix) === JSON.stringify(lastScores) && p.maximize === lastMaximize
    );
  const isFixtureEdited = isFixtureMode && lastScores !== null && !matchesKnownPreset;

  return (
    <section className="panel" aria-label="Matchups">
      {/* Header bar */}
      <div className="panel-header">
        <div>
          <h2>Matchups</h2>
          <p className="subtitle">Stage 3: Weapon-to-Boss Matchups Optimizer (Hungarian Method)</p>
        </div>
        <div className="badge badge-accent">
          <span className="status-dot-ok" />
          <span>Hungarian Method</span>
        </div>
      </div>

      {/* Main Responsive Layout: Side-by-side on desktop when steps are open */}
      <div className={`matchups-layout ${showSteps && result && !loading && !isFixtureEdited ? 'with-steps' : ''}`}>
        {/* Left Column: Grid, Warnings, and Result Panel */}
        <div className="matchups-left-col" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* SECTION 1: Setup & Score Matrix */}
          <section aria-label="Weapon Damage Setup">
            <ScoreGrid
              scores={initialScores}
              onSolve={handleSolve}
              onEdit={handleGridEdit}
              onScoresChange={onScoresChange}
              loading={loading}
              chosenPairs={isFixtureEdited ? [] : result?.answer?.pairsInfo}
            />
          </section>

          {/* Demo data banner (plan exact wording) */}
          {isFixtureEdited && (
            <div className="alert alert-warn" role="alert">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <strong className="alert-title">Demo data mode:</strong>
                <span> edited scores are only solved once the live API is connected.</span>
              </div>
            </div>
          )}

          {/* Error banner with retry */}
          {error && (
            <div className="alert alert-error" role="alert">
              <span className="alert-icon">❌</span>
              <div className="alert-content">
                <strong className="alert-title">Assignment Error:</strong>
                <span> {error}</span>
                <div style={{ marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => lastScores && handleSolve({ scores: lastScores, maximize: lastMaximize })}
                    className="btn-link"
                  >
                    ↺ Retry Calculation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="status-loading">
              <span className="spinner" />
              <span>Computing Hungarian Matrix Reductions…</span>
            </div>
          )}

          {/* Before the first Solve */}
          {!result && !loading && !error && !isFixtureEdited && (
            <p data-testid="solve-hint" className="todo">
              Press <strong style={{ color: 'var(--text-bright)' }}>Solve</strong> to find the best weapon-to-boss assignment.
            </p>
          )}

          {/* SECTION 2: Optimal Assignment Result Panel */}
          {result && !loading && !isFixtureEdited && (
            <section aria-label="Optimal Assignment">
              <ResultPanel
                answer={result.answer}
                originalScores={lastScores}
                maximize={lastMaximize}
                onViewSteps={toggleSteps}
                stepsShown={showSteps}
              />
            </section>
          )}
        </div>

        {/* Right Column: Steps View (beside the grid so Next doesn't scroll away) */}
        {showSteps && result && !loading && !isFixtureEdited && (
          <section aria-label="Step-by-Step Replay" ref={stepsRef} className="matchups-right-col">
            <StepsView
              steps={result.steps}
              answer={result.answer}
              originalRows={result.originalRows}
              originalCols={result.originalCols}
              originalScores={lastScores}
              maximize={lastMaximize}
              show={showSteps}
              onToggle={toggleSteps}
            />
          </section>
        )}
      </div>
    </section>
  );
}


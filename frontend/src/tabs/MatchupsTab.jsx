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
    <div className="text-slate-100 p-4 md:p-6 font-sans space-y-4 max-w-6xl mx-auto">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[var(--panel,#171e2e)] border border-[var(--panel-border,#2a3449)] rounded-xl px-4 py-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗡️</span>
          <div>
            <h2 className="text-sm font-black text-[var(--accent,#4cc9f0)] tracking-wider uppercase">
              Shadow Citadel
            </h2>
            <p className="text-[10px] text-slate-400">Stage 3: Weapon-to-Boss Matchups Optimizer</p>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-[var(--ok,#06d6a0)] shadow-[0_0_8px_rgba(6,214,160,0.5)]" />
          <span>Hungarian Method</span>
        </div>
      </div>

      {/* Main Responsive Layout: Side-by-side on desktop when steps are open */}
      <div className={`grid grid-cols-1 ${showSteps && result && !loading && !isFixtureEdited ? 'lg:grid-cols-2' : ''} gap-4 items-start`}>
        {/* Left Column: Grid, Warnings, and Result Panel */}
        <div className="space-y-4">
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
            <div className="flex items-start gap-2.5 bg-amber-950/40 border border-amber-500/60 rounded-xl px-4 py-3 text-xs text-amber-300 shadow-md">
              <span className="text-lg">⚠️</span>
              <div>
                <strong className="font-bold text-amber-200">Demo data mode:</strong>
                <span className="ml-1 text-amber-300/90">
                  edited scores are only solved once the live API is connected.
                </span>
              </div>
            </div>
          )}

          {/* Error banner with retry */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-950/40 border border-red-500/60 rounded-xl px-4 py-3 text-xs text-red-300 shadow-md">
              <span className="text-lg">❌</span>
              <div>
                <strong className="font-bold text-red-200">Assignment Error:</strong>
                <span className="ml-1 text-red-300/90">{error}</span>
                <div className="mt-1">
                  <button
                    type="button"
                    onClick={() => lastScores && handleSolve({ scores: lastScores, maximize: lastMaximize })}
                    className="text-xs font-bold underline text-red-400 hover:text-red-200 cursor-pointer"
                  >
                    ↺ Retry Calculation
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading Spinner */}
          {loading && (
            <div className="flex items-center justify-center gap-2.5 py-6 text-slate-300 bg-slate-900/60 rounded-xl border border-slate-800 text-xs font-bold text-[var(--accent,#4cc9f0)]">
              <span className="animate-spin text-lg">⚙️</span>
              <span>Computing Hungarian Matrix Reductions…</span>
            </div>
          )}

          {/* Before the first Solve */}
          {!result && !loading && !error && !isFixtureEdited && (
            <p data-testid="solve-hint" className="px-1 text-xs text-slate-400">
              Press <strong className="text-slate-200">Solve</strong> to find the best weapon-to-boss assignment.
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
          <section aria-label="Step-by-Step Replay" ref={stepsRef} className="scroll-mt-4">
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
    </div>
  );
}


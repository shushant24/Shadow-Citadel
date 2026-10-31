import React from 'react';

// Cell.jsx — Single editable cell for the ScoreGrid
export default function Cell({ value, onChange, isInvalid, label, onKeyDown, isChosen, disabled }) {
  return (
    <div className="relative inline-block">
      <input
        type="number"
        inputMode="numeric"
        min="0"
        max="999"
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        className={[
          'w-14 h-10 text-center text-sm font-mono bg-slate-700/80 text-slate-100',
          'rounded border focus:outline-none focus:ring-2 transition-all',
          isChosen
            ? 'ring-2 ring-[var(--ok,#06d6a0)] bg-emerald-950/70 border-[var(--ok,#06d6a0)] text-emerald-200 font-bold'
            : isInvalid
            ? 'border-[var(--danger,#ef476f)] ring-2 ring-[var(--danger,#ef476f)] bg-red-950/40 text-red-200'
            : 'border-slate-600 hover:border-slate-500 focus:ring-[var(--accent,#4cc9f0)]',
        ].join(' ')}
      />
      {isChosen && (
        <span
          className="absolute -top-1.5 -right-1.5 bg-[var(--ok,#06d6a0)] text-slate-950 text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center pointer-events-none shadow"
          title="Assigned match"
        >
          ✓
        </span>
      )}
    </div>
  );
}


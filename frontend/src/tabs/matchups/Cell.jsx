import React from 'react';

// Cell.jsx — Single editable cell for the ScoreGrid
export default function Cell({ value, onChange, isInvalid, label, onKeyDown, isChosen, disabled }) {
  const classes = [
    'matrix-cell-input',
    isChosen ? 'is-chosen' : '',
    isInvalid ? 'is-invalid' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className="matrix-cell-wrapper">
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
        className={classes}
      />
      {isChosen && (
        <span
          className="cell-chosen-check"
          title="Assigned match"
        >
          ✓
        </span>
      )}
    </div>
  );
}


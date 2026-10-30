"""Part 1: Simplex tableau engine (pivot rules, Bland's rule fallback, infeasible/unbounded detection, per-iteration steps)."""

from __future__ import annotations

import math


def validate_inputs(c, A, b, senses) -> None:
    """Validate input dimensions, types, finiteness, and values."""
    if not isinstance(c, (list, tuple)) or len(c) == 0:
        raise ValueError("c must be a non-empty list of coefficients")
    n_vars = len(c)
    for j, v in enumerate(c):
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
            raise ValueError(f"c[{j}] is not a finite number: {v!r}")

    if not isinstance(A, (list, tuple)) or not isinstance(b, (list, tuple)) or not isinstance(senses, (list, tuple)):
        raise ValueError("A, b, and senses must be lists or tuples")
    m_cons = len(A)
    if len(b) != m_cons or len(senses) != m_cons:
        raise ValueError(f"Length mismatch: len(A)={m_cons}, len(b)={len(b)}, len(senses)={len(senses)}")

    for i, v in enumerate(b):
        if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
            raise ValueError(f"b[{i}] is not a finite number: {v!r}")

    for i, row in enumerate(A):
        if not isinstance(row, (list, tuple)) or len(row) != n_vars:
            actual_len = len(row) if isinstance(row, (list, tuple)) else "N/A"
            raise ValueError(f"Row {i} of A has length {actual_len}, expected {n_vars}")
        for j, v in enumerate(row):
            if not isinstance(v, (int, float)) or isinstance(v, bool) or not math.isfinite(v):
                raise ValueError(f"A[{i}][{j}] is not a finite number: {v!r}")

    for i, s in enumerate(senses):
        if s not in {"<=", ">=", "="}:
            raise ValueError(f"Invalid sense {s!r} at index {i}; must be '<=', '>=', or '='")


class Tableau:
    """Tableau with pivoting. Every pivot appends one item to `steps` in the craft step format
    (docs/api-contract.md, validated by contract.py).

    Internal layout
    ---------------
    self.tab[i]  = constraint-row coefficients + RHS  (length = n_cols + 1)
    self.zrow_c  = z_j - c_j row (real part)          (length = n_cols + 1)
    self.zrow_m  = z_j - c_j row (Big-M part)         (length = n_cols + 1)
    self.columns = variable names (length = n_cols)
    self.basis   = current basic variable names per row
    self.excluded_columns = columns forbidden from entering the basis (e.g. artificials in Phase 2)
    """

    def __init__(self, columns: list[str], basis: list[str],
                 tab: list[list[float]], zrow_c: list[float], zrow_m: list[float],
                 phase: str = "bigm", excluded_columns: set[str] | list[str] | None = None):
        self.columns = list(columns)
        self.basis = list(basis)
        self.tab = [list(row) for row in tab]
        self.zrow_c = list(zrow_c)
        self.zrow_m = list(zrow_m)
        self.phase = phase
        self.excluded_columns = set(excluded_columns or [])
        self.steps: list[dict] = []
        self._iteration = 0

    # ------------------------------------------------------------------ helpers
    @property
    def n_rows(self) -> int:
        return len(self.tab)

    @property
    def n_cols(self) -> int:
        return len(self.columns)

    def _col_index(self, name: str) -> int:
        return self.columns.index(name)

    def _snapshot(self, entering: str | None, leaving: str | None,
                  pivot: list[int] | None) -> dict:
        """Create a step dict matching the craft step contract."""
        z_val = self.zrow_c[-1]   # RHS of z-row (real part)
        z_m_val = self.zrow_m[-1]  # RHS of z-row (M part)
        return {
            "iteration": self._iteration,
            "phase": self.phase,
            "columns": list(self.columns),
            "basis": list(self.basis),
            "tableau": [list(row) for row in self.tab],
            "zrow": {
                "c": list(self.zrow_c),
                "m": list(self.zrow_m),
            },
            "entering": entering,
            "leaving": leaving,
            "pivot": list(pivot) if pivot is not None else None,
            "z": z_val,
            "z_m": z_m_val,
        }

    # ------------------------------------------------------------------ pivot selection
    def _entering_column(self, blands: bool = False) -> int | None:
        """Find entering variable (lexicographic on (m, c)).
        Excluded columns (such as artificial columns in Phase 2) are skipped.

        Big-M is strictly tiered: if any candidate has m < 0, only m-negative columns
        are eligible. In Bland mode, Bland's smallest-index rule applies within the
        active tier.
        """
        eps = -1e-10

        # Tier 1: Check if any eligible column has m < 0
        has_negative_m = False
        for j in range(self.n_cols):
            if self.columns[j] in self.excluded_columns:
                continue
            if self.zrow_m[j] < eps:
                has_negative_m = True
                break

        best_col = None
        best_m = 0.0
        best_c = 0.0

        for j in range(self.n_cols):
            if self.columns[j] in self.excluded_columns:
                continue

            m_val = self.zrow_m[j]
            c_val = self.zrow_c[j]

            if has_negative_m:
                # Only consider columns with m < 0
                if m_val >= eps:
                    continue
            else:
                # m is zero, consider columns with c < 0
                if abs(m_val) >= 1e-10 or c_val >= eps:
                    continue

            if blands:
                # Bland's rule: smallest column index within the active tier
                if best_col is None:
                    best_col = j
                    best_m = m_val
                    best_c = c_val
            else:
                # Dantzig's rule: most negative (m, c)
                if best_col is None:
                    best_col = j
                    best_m = m_val
                    best_c = c_val
                else:
                    if (m_val < best_m - 1e-10) or \
                       (abs(m_val - best_m) < 1e-10 and c_val < best_c - 1e-10):
                        best_col = j
                        best_m = m_val
                        best_c = c_val

        return best_col

    def _leaving_row(self, col: int, blands: bool = False) -> int | None:
        """Minimum ratio test. Returns None if unbounded.
        With Bland's rule, break ties by smallest basis index."""
        best_row = None
        best_ratio = float("inf")
        best_bland_idx = float("inf")

        for i in range(self.n_rows):
            a_ij = self.tab[i][col]
            if a_ij <= 1e-10:
                continue
            ratio = self.tab[i][-1] / a_ij
            if ratio < best_ratio - 1e-10:
                best_ratio = ratio
                best_row = i
                best_bland_idx = self._col_index(self.basis[i]) if blands else 0
            elif blands and abs(ratio - best_ratio) < 1e-10:
                idx = self._col_index(self.basis[i])
                if idx < best_bland_idx:
                    best_row = i
                    best_bland_idx = idx

        return best_row

    # ------------------------------------------------------------------ pivot operation
    def pivot(self, row: int, col: int) -> None:
        """Perform a single pivot: make tab[row][col] the identity column."""
        piv = self.tab[row][col]
        if abs(piv) < 1e-15:
            raise ValueError("Pivot element is zero")

        width = self.n_cols + 1
        self.tab[row] = [self.tab[row][k] / piv for k in range(width)]

        for i in range(self.n_rows):
            if i == row:
                continue
            factor = self.tab[i][col]
            if abs(factor) < 1e-15:
                continue
            self.tab[i] = [self.tab[i][k] - factor * self.tab[row][k] for k in range(width)]

        for zrow in (self.zrow_c, self.zrow_m):
            factor = zrow[col]
            if abs(factor) < 1e-15:
                continue
            for k in range(width):
                zrow[k] -= factor * self.tab[row][k]

        self.basis[row] = self.columns[col]
        self._clean()

    def pivot_recorded(self, row: int, col: int) -> None:
        """Perform a pivot and record it as a step in the trace."""
        entering = self.columns[col]
        leaving = self.basis[row]
        self.steps.append(self._snapshot(entering, leaving, [row, col]))
        self._iteration += 1
        self.pivot(row, col)

    def _clean(self, eps: float = 1e-12) -> None:
        """Round near-zero values to 0 to avoid floating point artifacts."""
        width = self.n_cols + 1
        for i in range(self.n_rows):
            for k in range(width):
                if abs(self.tab[i][k]) < eps:
                    self.tab[i][k] = 0.0
        for zrow in (self.zrow_c, self.zrow_m):
            for k in range(width):
                if abs(zrow[k]) < eps:
                    zrow[k] = 0.0

    # ------------------------------------------------------------------ solve
    def solve(self, max_iters: int = 1000, blands: bool = False) -> str:
        """Run the simplex method on this tableau.

        Returns "optimal", "unbounded", or "iteration_limit".
        Populates self.steps with one snapshot per iteration (iter 0 = initial).
        If cycling is detected (repeated basis), seamlessly switches to Bland's rule in-place
        without erasing prior step history.
        """
        seen_bases: set[tuple[str, ...]] = set()

        for _ in range(max_iters):
            basis_key = tuple(sorted(self.basis))
            if not blands:
                if basis_key in seen_bases:
                    blands = True
                else:
                    seen_bases.add(basis_key)

            col = self._entering_column(blands=blands)

            if col is None:
                # Record the final (optimal) snapshot
                self.steps.append(self._snapshot(None, None, None))
                self._iteration += 1
                return "optimal"

            row = self._leaving_row(col, blands=blands)
            entering = self.columns[col]

            if row is None:
                # Unbounded: record snapshot with entering but no leaving
                self.steps.append(self._snapshot(entering, None, None))
                self._iteration += 1
                return "unbounded"

            leaving = self.basis[row]
            self.steps.append(self._snapshot(entering, leaving, [row, col]))
            self._iteration += 1

            self.pivot(row, col)

        return "iteration_limit"

    # ------------------------------------------------------------------ reading results
    def get_solution(self) -> list[float]:
        """Return the values of all decision variables (x1, x2, ...) in column order."""
        values = []
        for j, name in enumerate(self.columns):
            if name in self.basis:
                row_idx = self.basis.index(name)
                values.append(self.tab[row_idx][-1])
            else:
                values.append(0.0)
        return values

    def get_objective(self) -> float:
        """Return the current objective value (real part)."""
        return self.zrow_c[-1]


def solve(c, A, b, senses, maximize=True):
    """Convenience wrapper — delegates to bigm."""
    from solvers.bigm import solve_bigm
    return solve_bigm(c, A, b, senses, maximize=maximize)

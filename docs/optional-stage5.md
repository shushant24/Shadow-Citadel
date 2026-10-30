# Optional Stage 5: supply distribution (transportation). NOT built, no stubs, no tests.

Only start this when the four core stages are finished. It adds NWCR / LCM / VAM and MODI (including an unbalanced case).

Proposed contract (extend `backend/contract.py`, add a fixture and a Part-style test the same way as the other stages):

- `POST /api/transport`, body `{"supply": [..], "demand": [..], "costs": [[..]], "initial": "nwcr"|"lcm"|"vam", "improve": "modi"}`.
- `answer`: `allocation` (matrix), `total_cost`, `initial_cost`, `balanced` (bool), `dummy` (`{"kind": "row"|"column", "index": n}` or `null`).
- Steps: `{"phase": "initial"|"modi", "allocation": [[..]], "u": [..], "v": [..], "opportunity": [[..]], "entering": [r, c], "cost": n}`.
- Files: `solvers/transport.py`, `api/api_transport.py` (register in `app.py`), one more frontend tab, `fixtures/transport.json`.

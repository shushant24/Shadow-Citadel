// matchupsApi.js
// Thin wrapper around Part 6's api.assign. All fixture routing (5x5, 5x4, 4x5, 4x4 max/min)
// lives in api.js, so every caller of api.assign gets the same answer in fixture mode.

import { api } from '../../api.js';

export async function solveAssign({ scores, maximize = true }) {
  return api.assign(scores, maximize);
}

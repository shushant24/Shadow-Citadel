/**
 * API client for Shadow Citadel Raid Optimizer
 */
const BASE_URL = import.meta.env?.VITE_API_BASE_URL || 'http://localhost:8000';
const USE_FIXTURES = import.meta.env?.VITE_USE_FIXTURES === 'true';

export async function fetchCraftPlan({
  timeLimit = 50,
  method = 'bigm',
  limits,
  recipes
}) {
  if (USE_FIXTURES) {
    if (timeLimit <= 40) {
      return (await import('../../fixtures/craft_infeasible.json')).default;
    }
    if (timeLimit === 42) {
      return (await import('../../fixtures/craft_42min.json')).default;
    }
    return method === 'twophase'
      ? (await import('../../fixtures/craft_twophase.json')).default
      : (await import('../../fixtures/craft.json')).default;
  }

  const res = await fetch(`${BASE_URL}/api/craft`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      time_limit: timeLimit,
      method,
      limits,
      recipes
    })
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.statusText}`);
  }

  return await res.json();
}

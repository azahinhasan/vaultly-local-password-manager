/** Entries that opted in to "delete after N wrong PINs": id -> limit (+ whether it has its own PIN). */
export type Registry = Record<string, { limit: number; hasCustomPin: boolean }>;

export const MAX_WRONG_LIMIT = 99;

/** A valid limit is a whole number from 1 up to MAX_WRONG_LIMIT. */
export const isValidLimit = (n: number): boolean =>
  Number.isInteger(n) && n >= 1 && n <= MAX_WRONG_LIMIT;

/**
 * Builds the registry from the vault's entries. It holds only ids and numbers
 * (no platform, username or password), so it can sit outside the encrypted
 * vault — which is needed to act while the vault is still locked.
 */
export function buildRegistry(
  entries: { id: string; deleteAfterWrong?: number; customPin?: unknown }[],
): Registry {
  const registry: Registry = {};
  for (const e of entries) {
    if (e.deleteAfterWrong !== undefined && isValidLimit(e.deleteAfterWrong)) {
      registry[e.id] = { limit: e.deleteAfterWrong, hasCustomPin: !!e.customPin };
    }
  }
  return registry;
}

/** Entries whose limit has been reached by this many consecutive wrong main-PIN entries. */
export function mainPinVictims(registry: Registry, mainPinFails: number): string[] {
  return Object.entries(registry)
    .filter(([, r]) => r.limit <= mainPinFails)
    .map(([id]) => id);
}

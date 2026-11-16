/** Splits a SHA-1 hash into the 5-char prefix sent to the API and the suffix matched locally. */
export function splitHash(sha1Hex: string): { prefix: string; suffix: string } {
  const h = sha1Hex.toUpperCase();
  return { prefix: h.slice(0, 5), suffix: h.slice(5) };
}

/**
 * Looks for `suffix` in a Pwned Passwords range response ("SUFFIX:COUNT" lines).
 * Padding entries have count 0, so they never count as a hit.
 */
export function countInRange(body: string, suffix: string): number {
  for (const line of body.split(/\r?\n/)) {
    const [s, count] = line.trim().split(":");
    if (s === suffix) return Number(count) || 0;
  }
  return 0;
}

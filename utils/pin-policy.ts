/** How long a manual PIN entry keeps biometric unlock allowed. */
export const PIN_EVERY_OPTIONS = [
  { hours: 24, label: "24 hours" },
  { hours: 48, label: "48 hours" },
  { hours: 72, label: "72 hours" },
] as const;

export const DEFAULT_PIN_EVERY_HOURS = 24;

export const isPinEveryHours = (n: number): boolean =>
  PIN_EVERY_OPTIONS.some((o) => o.hours === n);

/**
 * True while the last manual PIN entry is within `hours`. A missing timestamp
 * (never entered, or data from before this feature) and a timestamp in the
 * future (clock set back) both count as "not recent", so the PIN is required.
 */
export function isPinRecent(
  lastPinAt: number | null,
  hours: number,
  now: number = Date.now(),
): boolean {
  if (lastPinAt === null || Number.isNaN(lastPinAt)) return false;
  const age = now - lastPinAt;
  return age >= 0 && age < hours * 3_600_000;
}

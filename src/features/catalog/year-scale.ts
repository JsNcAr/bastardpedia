/**
 * The year slider's scale. Stories cluster in the last few centuries but reach back
 * thousands of years, so a linear slider would spend almost all its travel on antiquity.
 * Positions 0..STEPS map to years with a cubic curve: the right-hand side of the slider
 * moves a year or two per step, the far left jumps through millennia.
 */
export const STEPS = 1000;

export function yearAt(step: number, min: number, max: number): number {
  const t = Math.min(Math.max(step / STEPS, 0), 1);
  return Math.round(max - (max - min) * (1 - t) ** 3);
}

export function stepAt(year: number, min: number, max: number): number {
  if (max <= min) return STEPS;
  const y = Math.min(Math.max(year, min), max);
  return Math.round((1 - Math.cbrt((max - y) / (max - min))) * STEPS);
}

/** The slider's range: from the earliest covered year (rounded down to a century) to now. */
export function yearBounds(
  spans: readonly ({ start: number; end: number } | undefined)[],
  now = new Date().getFullYear(),
): { min: number; max: number } {
  const starts = spans.flatMap((s) => (s ? [s.start] : []));
  const earliest = starts.length ? Math.min(...starts) : now - 100;
  return { min: Math.floor(earliest / 100) * 100, max: now };
}

/** Parses "1837", "-149" or "149 BCE" into a year, or null when empty or invalid. */
export function parseYear(text: string): number | null {
  const t = text.trim().toUpperCase();
  if (!t) return null;
  const bce = /\s*(BCE|BC)$/.test(t);
  const n = Number(t.replace(/\s*(BCE|BC|CE|AD)$/, ''));
  if (!Number.isInteger(n)) return null;
  return bce ? -Math.abs(n) : n;
}

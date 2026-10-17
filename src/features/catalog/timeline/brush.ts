import { toYear, type Domain } from './axis';
import type { Bin } from './density';

/**
 * A drag across the density strip, in viewBox x (0..WIDTH), to a year range.
 * Dragging either way works. A drag shorter than `clickSlop` counts as a click
 * and selects the bin under it.
 */
export function rangeFromDrag(
  x0: number,
  x1: number,
  d: Domain,
  binsList: readonly Bin[],
  clickSlop = 4,
): { from: number; to: number } | null {
  if (Math.abs(x1 - x0) < clickSlop) {
    const year = toYear(x0, d);
    const bin = binsList.find((b) => year >= b.start && year < b.end);
    return bin ? { from: bin.start, to: bin.end - 1 } : null;
  }
  const a = toYear(Math.min(x0, x1), d);
  const b = toYear(Math.max(x0, x1), d);
  return a === b ? null : { from: a, to: b };
}

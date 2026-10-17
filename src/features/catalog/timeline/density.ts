import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { niceStep, type Domain } from './axis';

export interface Bin {
  start: number;
  /** Exclusive. */
  end: number;
  count: number;
}

/** Bin size for about `target` bins over the domain (a decade in the usual range). */
export const binSize = (d: Domain, target = 40) => Math.max(1, niceStep(d.end - d.start, target));

/**
 * How many stories cover each bin of the domain, counted by overlap with their
 * years covered: the same years the period filters use.
 */
export function bins(stories: readonly CatalogStory[], d: Domain, size = binSize(d)): Bin[] {
  const first = Math.floor(d.start / size) * size;
  const out: Bin[] = [];
  for (let y = first; y < d.end; y += size) out.push({ start: y, end: y + size, count: 0 });
  for (const s of stories) {
    const span = s.time?.covered_span;
    if (!span) continue;
    for (const b of out) if (span.start < b.end && span.end >= b.start) b.count++;
  }
  return out;
}

import type { CatalogStory } from '@shared/schemas/catalog.ts';

/** SVG viewBox width every timeline graphic shares: x runs 0..WIDTH. */
export const WIDTH = 1000;

export interface Domain {
  start: number;
  end: number;
}

/** Below this the axis is padded out, so a narrow filter still reads as a range. */
export const MIN_SPAN = 20;

/**
 * How far below the lower quartile of starts, in interquartile ranges, a start
 * has to be to count as an outlier: Tukey's "far out" fence. It scales with the
 * results, so one prehistoric story among 40 modern ones doesn't squash the axis,
 * where a fixed percentile would keep it.
 */
export const FENCE = 3;

const quantile = (sorted: readonly number[], p: number) =>
  sorted[Math.floor(p * (sorted.length - 1))] ?? 0;

/**
 * The years the timeline shows. A year filter sets the ends; otherwise the start
 * is the earliest covered start inside the outlier fence, and the end is the
 * latest covered end (or the current year, for stories that reach the present).
 */
export function domainFor(
  stories: readonly CatalogStory[],
  filters: { yearFrom: number | null; yearTo: number | null },
  now = new Date().getFullYear(),
): Domain {
  const spans = stories.flatMap((s) => (s.time ? [s.time.covered_span] : []));
  const starts = spans.map((s) => s.start).sort((a, b) => a - b);
  const q1 = quantile(starts, 0.25);
  const fence = q1 - FENCE * (quantile(starts, 0.75) - q1);
  const fallbackStart = starts.find((y) => y >= fence) ?? now - MIN_SPAN;
  const fallbackEnd = spans.length ? Math.max(...spans.map((s) => s.end)) : now;
  let start = filters.yearFrom ?? fallbackStart;
  let end = filters.yearTo ?? Math.min(Math.max(fallbackEnd, start), now);
  if (end - start < MIN_SPAN) {
    const pad = (MIN_SPAN - (end - start)) / 2;
    start = Math.floor(start - pad);
    end = Math.ceil(end + pad);
  }
  return { start, end };
}

/** Year to x on 0..WIDTH. */
export const toX = (year: number, d: Domain) => ((year - d.start) / (d.end - d.start)) * WIDTH;

/** x on 0..WIDTH to the nearest year. */
export const toYear = (x: number, d: Domain) =>
  Math.round(d.start + (Math.min(Math.max(x, 0), WIDTH) / WIDTH) * (d.end - d.start));

/** Which edge a span lies wholly beyond, if it misses the axis entirely. */
export const offAxis = (span: { start: number; end: number }, d: Domain) =>
  span.end < d.start ? 'before' : span.start > d.end ? 'after' : null;

/** A span placed on the axis, clipped to it, with flags for the edges it runs off. */
export function clip(
  span: { start: number; end: number },
  d: Domain,
): { x: number; width: number; clippedStart: boolean; clippedEnd: boolean } | null {
  if (span.end < d.start || span.start > d.end) return null;
  const x0 = toX(Math.max(span.start, d.start), d);
  const x1 = toX(Math.min(span.end, d.end), d);
  return {
    x: x0,
    width: Math.max(x1 - x0, 0),
    clippedStart: span.start < d.start,
    clippedEnd: span.end > d.end,
  };
}

/**
 * A "nice" step (1, 2 or 5 times a power of ten) whose count over `span` is
 * closest to `target`. Ties go to the larger step: fewer labels fit narrow panes.
 */
export function niceStep(span: number, target: number): number {
  const raw = span / Math.max(target, 1);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const candidates = [1, 2, 5, 10, 20].map((m) => m * pow);
  let best = candidates[0] ?? 1;
  for (const step of candidates) {
    if (Math.abs(span / step - target) <= Math.abs(span / best - target)) best = step;
  }
  return best;
}

/** Tick years for the axis: multiples of a nice step inside the domain. */
export function ticks(d: Domain, target = 7): number[] {
  const step = niceStep(d.end - d.start, target);
  const out: number[] = [];
  for (let y = Math.ceil(d.start / step) * step; y <= d.end; y += step) out.push(y);
  return out;
}

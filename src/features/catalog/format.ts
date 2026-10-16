import type { CatalogStory } from '@shared/schemas/catalog.ts';

export function formatYear(y: number): string {
  return y < 0 ? `${String(-y)} BCE` : String(y);
}

export function formatSpan(
  span: { start: number | null; end: number | null },
  approximate = false,
): string {
  const c = approximate ? 'c. ' : '';
  if (span.start === null && span.end === null) return 'Dates unknown';
  if (span.start === null) return `? to ${formatYear(span.end ?? 0)}`;
  if (span.end === null) return `${c}${formatYear(span.start)} to present`;
  if (span.start === span.end) return `${c}${formatYear(span.start)}`;
  // A BCE start with a CE end needs both suffixes; two CE years need none.
  if (span.start < 0 && span.end >= 0)
    return `${c}${formatYear(span.start)} to ${formatYear(span.end)} CE`;
  return `${c}${formatYear(span.start)} to ${formatYear(span.end)}`;
}

export function storyPeriod(story: CatalogStory): string | null {
  return story.time ? formatSpan(story.time.main_span, story.time.approximate) : null;
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${String(n)}th`;
  const suffix = ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
  return `${String(n)}${suffix}`;
}

/** 19 -> "19th century", -1 -> "1st century BCE". */
export function centuryLabel(n: number): string {
  return n < 0 ? `${ordinal(-n)} century BCE` : `${ordinal(n)} century`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${String(m)} min`;
  return m === 0 ? `${String(h)} h` : `${String(h)} h ${String(m)} min`;
}

export function partsLabel(n: number): string {
  return n === 1 ? '1 part' : `${String(n)} parts`;
}

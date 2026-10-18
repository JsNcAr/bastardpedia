import type { CatalogStory } from '@shared/schemas/catalog.ts';
import type { Bin } from '@/features/catalog/timeline/density';

/**
 * Release months as one number each (year * 12 + month - 1), so they sit on the
 * same numeric axis, bins and brush as the timeline's years.
 */
export type Month = number;

export const monthOf = (iso: string): Month => {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  return year * 12 + month - 1;
};

/** For `<input type="month">`: "2019-03". */
export const monthValue = (m: Month) =>
  `${String(Math.floor(m / 12))}-${String((m % 12) + 1).padStart(2, '0')}`;

/** Back from an `<input type="month">` value; null when empty or malformed. */
export const parseMonth = (value: string): Month | null =>
  /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? monthOf(value) : null;

const NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Mar 2019". */
export const monthLabel = (m: Month) => `${NAMES[m % 12] ?? ''} ${String(Math.floor(m / 12))}`;

export const released = (s: CatalogStory): Month => monthOf(s.first_published);

/** `none` skips the release-date step: the visitor ticks stories by hand. */
export type Preset = 'none' | 'all' | 'until' | 'since' | 'between';

export interface CatchUpChoice {
  preset: Preset;
  from: Month;
  to: Month;
  /** Format ids left out, such as live shows. */
  skipFormats: ReadonlySet<string>;
}

/** The release months a choice covers, both ends included; null for `none`. */
export function monthRange(
  c: CatchUpChoice,
  first: Month,
  last: Month,
): { from: Month; to: Month } | null {
  switch (c.preset) {
    case 'none':
      return null;
    case 'all':
      return { from: first, to: last };
    case 'until':
      return { from: first, to: c.to };
    case 'since':
      return { from: c.from, to: last };
    case 'between':
      return { from: Math.min(c.from, c.to), to: Math.max(c.from, c.to) };
  }
}

/** The first and last release months in the catalogue. */
export function releaseBounds(stories: readonly CatalogStory[]): { first: Month; last: Month } {
  const months = stories.map(released);
  return { first: Math.min(...months), last: Math.max(...months) };
}

/** Stories a choice covers, oldest first. None for `none`. */
export function storiesFor(
  stories: readonly CatalogStory[],
  c: CatchUpChoice,
  first: Month,
  last: Month,
): CatalogStory[] {
  const range = monthRange(c, first, last);
  if (!range) return [];
  const { from, to } = range;
  return stories
    .filter((s) => {
      const m = released(s);
      return m >= from && m <= to && !c.skipFormats.has(s.format);
    })
    .sort((a, b) => a.first_published.localeCompare(b.first_published));
}

/** Stories per release month, for the chart. `end` is exclusive, as in the timeline. */
export function monthBins(stories: readonly CatalogStory[], first: Month, last: Month): Bin[] {
  const out: Bin[] = [];
  for (let m = first; m <= last; m++) out.push({ start: m, end: m + 1, count: 0 });
  for (const s of stories) {
    const bin = out[released(s) - first];
    if (bin) bin.count += 1;
  }
  return out;
}

/** Stories grouped by release year, in order. */
export function byYear(stories: readonly CatalogStory[]): [number, CatalogStory[]][] {
  const groups = new Map<number, CatalogStory[]>();
  for (const s of stories) {
    const year = Math.floor(released(s) / 12);
    const list = groups.get(year) ?? [];
    list.push(s);
    groups.set(year, list);
  }
  return [...groups.entries()];
}

/** "212 stories, 389 episodes, about 410 hours". */
export function totals(stories: readonly CatalogStory[]): {
  stories: number;
  episodes: number;
  hours: number;
} {
  return {
    stories: stories.length,
    episodes: stories.reduce((n, s) => n + s.parts.length, 0),
    hours: Math.round(stories.reduce((n, s) => n + s.total_duration_s, 0) / 3600),
  };
}

/** Every story, oldest first: the catch-up list always shows them all. */
export const oldestFirst = (stories: readonly CatalogStory[]) =>
  [...stories].sort((a, b) => a.first_published.localeCompare(b.first_published));

/**
 * What saving the catch-up does: mark the ticked stories that aren't listened yet,
 * unmark the listened ones left unticked. Only `shown` stories count, so a
 * left-out format is neither marked nor unmarked.
 */
export function changes(
  shown: readonly CatalogStory[],
  ticked: ReadonlySet<string>,
  listened: ReadonlySet<string>,
): { mark: string[]; unmark: string[] } {
  const mark: string[] = [];
  const unmark: string[] = [];
  for (const s of shown) {
    if (ticked.has(s.id) && !listened.has(s.id)) mark.push(s.id);
    else if (!ticked.has(s.id) && listened.has(s.id)) unmark.push(s.id);
  }
  return { mark, unmark };
}

/** A release-date choice adds to what is already listened; it never unticks. */
export const ticksFor = (listened: ReadonlySet<string>, covered: readonly CatalogStory[]) =>
  new Set([...listened, ...covered.map((s) => s.id)]);

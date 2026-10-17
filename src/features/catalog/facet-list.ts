/**
 * Progressive disclosure for filter lists: the few options with the most
 * stories first, the full list on request. Pure, so the rules are tested here
 * and FacetList.tsx only renders them.
 */

export interface ListOption {
  id: string;
  label: string;
  count: number;
  checked: boolean;
  /** Subheading in the full list, e.g. a theme group or a continent. */
  group?: string | undefined;
}

/** Options shown before "Show all". */
export const DEFAULT_LIMIT = 5;

/** A list this long shows everything: never a "show 1 more" button. */
export const SHOW_ALL_UP_TO = 7;

/** Lists longer than this get a find box when expanded. */
export const FIND_FROM = 20;

export const needsToggle = (total: number, limit = DEFAULT_LIMIT) =>
  total > Math.max(limit, SHOW_ALL_UP_TO);

/**
 * The collapsed view: the `limit` options with the most stories (ties keep the
 * canonical order), plus every checked option, so a selection is never hidden.
 * Returned in canonical order. Or, with `order: 'count'`, most stories first.
 */
export function topOptions<T extends ListOption>(
  options: readonly T[],
  limit = DEFAULT_LIMIT,
  order: 'canonical' | 'count' = 'count',
): T[] {
  const ranked = options
    .map((o, i) => ({ o, i }))
    .sort((a, b) => b.o.count - a.o.count || a.i - b.i);
  const keep = new Set(ranked.slice(0, limit).map((r) => r.o.id));
  for (const o of options) if (o.checked) keep.add(o.id);
  const picked = ranked.filter((r) => keep.has(r.o.id));
  if (order === 'canonical') picked.sort((a, b) => a.i - b.i);
  return picked.map((r) => r.o);
}

/** The collapsed view for ordered lists (centuries): the first `limit`, plus checked ones. */
export function firstOptions<T extends ListOption>(
  options: readonly T[],
  limit = DEFAULT_LIMIT,
): T[] {
  return options.filter((o, i) => i < limit || o.checked);
}

const fold = (s: string) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

/** Case- and accent-insensitive substring match for the find box. */
export const matchesQuery = (label: string, query: string) =>
  query.trim() === '' || fold(label).includes(fold(query.trim()));

/** Groups in first-appearance order, for the expanded view's subheadings. */
export function grouped<T extends ListOption>(options: readonly T[]): [string, T[]][] {
  const out = new Map<string, T[]>();
  for (const o of options) {
    const k = o.group ?? '';
    out.set(k, [...(out.get(k) ?? []), o]);
  }
  return [...out];
}

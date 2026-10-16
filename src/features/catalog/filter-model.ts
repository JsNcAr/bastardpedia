/**
 * The filter model. The URL is its only home: filters are read from and
 * written to the query string, so every result list is a shareable link and
 * the back button undoes a filter. Semantics are in match.ts.
 */

export const SORTS = ['relevance', 'newest', 'oldest', 'chronological'] as const;
export type SortKey = (typeof SORTS)[number];

export interface Filters {
  q: string;
  format: string[];
  theme: string[];
  role: string[];
  continent: string[];
  country: string[];
  era: string[];
  century: number[];
  /** Content warnings whose stories are hidden. */
  cwHide: string[];
  /** null = automatic: relevance while searching, newest otherwise. */
  sort: SortKey | null;
}

/** The multi-value facets, in display and URL order. */
export const FACETS = [
  'era',
  'century',
  'theme',
  'role',
  'continent',
  'country',
  'format',
] as const;
export type Facet = (typeof FACETS)[number];

const PARAM = {
  q: 'q',
  format: 'format',
  theme: 'theme',
  role: 'role',
  continent: 'continent',
  country: 'country',
  era: 'era',
  century: 'century',
  cwHide: 'cw-hide',
  sort: 'sort',
} as const;

export const EMPTY_FILTERS: Filters = {
  q: '',
  format: [],
  theme: [],
  role: [],
  continent: [],
  country: [],
  era: [],
  century: [],
  cwHide: [],
  sort: null,
};

const unique = <T>(xs: T[]) => [...new Set(xs)];
const strings = (p: URLSearchParams, key: string) =>
  unique(
    p
      .getAll(key)
      .map((v) => v.trim())
      .filter(Boolean),
  );

export function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get(PARAM.sort);
  return {
    q: (params.get(PARAM.q) ?? '').trim(),
    format: strings(params, PARAM.format),
    theme: strings(params, PARAM.theme),
    role: strings(params, PARAM.role),
    continent: strings(params, PARAM.continent),
    country: strings(params, PARAM.country).map((c) => c.toUpperCase()),
    era: strings(params, PARAM.era),
    century: unique(
      params
        .getAll(PARAM.century)
        .map(Number)
        .filter((n) => Number.isInteger(n) && n !== 0),
    ),
    cwHide: strings(params, PARAM.cwHide),
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : null,
  };
}

/** Stable order, empties omitted, so equal filters give equal URLs. */
export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set(PARAM.q, f.q);
  for (const facet of FACETS) for (const v of f[facet]) p.append(PARAM[facet], String(v));
  for (const v of f.cwHide) p.append(PARAM.cwHide, v);
  if (f.sort) p.set(PARAM.sort, f.sort);
  return p;
}

export function toggleValue(f: Filters, facet: Facet, value: string): Filters {
  if (facet === 'century') {
    const n = Number(value);
    const has = f.century.includes(n);
    return { ...f, century: has ? f.century.filter((c) => c !== n) : [...f.century, n] };
  }
  const list = f[facet];
  return {
    ...f,
    [facet]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
  };
}

export function toggleHiddenWarning(f: Filters, id: string): Filters {
  return {
    ...f,
    cwHide: f.cwHide.includes(id) ? f.cwHide.filter((v) => v !== id) : [...f.cwHide, id],
  };
}

export const activeCount = (f: Filters) =>
  FACETS.reduce((n, facet) => n + f[facet].length, 0) + f.cwHide.length + (f.q ? 1 : 0);

export const resolvedSort = (f: Filters): SortKey => f.sort ?? (f.q ? 'relevance' : 'newest');

/** A link to a fresh search for one tag, used by the tags on a story page. */
export function tagSearch(facet: Facet, value: string | number): string {
  return `/?${serializeFilters(toggleValue(EMPTY_FILTERS, facet, String(value))).toString()}`;
}

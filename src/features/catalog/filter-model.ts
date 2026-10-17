/**
 * The filter model. The URL is its only home: filters are read from and
 * written to the query string, so every result list is a shareable link and
 * the back button undoes a filter. Semantics are in match.ts.
 */

export const SORTS = ['relevance', 'newest', 'oldest', 'chronological'] as const;
export type SortKey = (typeof SORTS)[number];

export const VIEWS = ['list', 'timeline'] as const;
export type ViewKey = (typeof VIEWS)[number];

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
  /** Only stories a person has reviewed field by field. */
  reviewedOnly: boolean;
  /** Leave out stories the visitor marked as listened (their library, this browser). */
  hideListened: boolean;
  /** Year range matched against covered years; null = open on that side. Negative = BCE. */
  yearFrom: number | null;
  yearTo: number | null;
  /** null = automatic: relevance while searching, by period on the timeline, newest otherwise. */
  sort: SortKey | null;
  /** How the results are shown. Not a filter: it never counts as one. */
  view: ViewKey;
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
  reviewedOnly: 'reviewed',
  hideListened: 'hide-listened',
  yearFrom: 'from',
  yearTo: 'to',
  sort: 'sort',
  view: 'view',
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
  reviewedOnly: false,
  hideListened: false,
  yearFrom: null,
  yearTo: null,
  sort: null,
  view: 'list',
};

const unique = <T>(xs: T[]) => [...new Set(xs)];
const strings = (p: URLSearchParams, key: string) =>
  unique(
    p
      .getAll(key)
      .map((v) => v.trim())
      .filter(Boolean),
  );

function year(p: URLSearchParams, key: string): number | null {
  const raw = p.get(key);
  if (raw === null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

export function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get(PARAM.sort);
  let yearFrom = year(params, PARAM.yearFrom);
  let yearTo = year(params, PARAM.yearTo);
  if (yearFrom !== null && yearTo !== null && yearFrom > yearTo)
    [yearFrom, yearTo] = [yearTo, yearFrom];
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
    reviewedOnly: params.get(PARAM.reviewedOnly) === '1',
    hideListened: params.get(PARAM.hideListened) === '1',
    yearFrom,
    yearTo,
    sort: (SORTS as readonly string[]).includes(sort ?? '') ? (sort as SortKey) : null,
    view: params.get(PARAM.view) === 'timeline' ? 'timeline' : 'list',
  };
}

/** Stable order, empties omitted, so equal filters give equal URLs. */
export function serializeFilters(f: Filters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set(PARAM.q, f.q);
  for (const facet of FACETS) for (const v of f[facet]) p.append(PARAM[facet], String(v));
  for (const v of f.cwHide) p.append(PARAM.cwHide, v);
  if (f.yearFrom !== null) p.set(PARAM.yearFrom, String(f.yearFrom));
  if (f.yearTo !== null) p.set(PARAM.yearTo, String(f.yearTo));
  if (f.reviewedOnly) p.set(PARAM.reviewedOnly, '1');
  if (f.hideListened) p.set(PARAM.hideListened, '1');
  if (f.sort) p.set(PARAM.sort, f.sort);
  if (f.view !== 'list') p.set(PARAM.view, f.view);
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
  FACETS.reduce((n, facet) => n + f[facet].length, 0) +
  f.cwHide.length +
  (f.q ? 1 : 0) +
  (f.reviewedOnly ? 1 : 0) +
  (f.hideListened ? 1 : 0) +
  (f.yearFrom !== null || f.yearTo !== null ? 1 : 0);

export const resolvedSort = (f: Filters): SortKey =>
  f.sort ?? (f.q ? 'relevance' : f.view === 'timeline' ? 'chronological' : 'newest');

/** A link to a fresh search for one tag, used by the tags on a story page. */
export function tagSearch(facet: Facet, value: string | number): string {
  return `/?${serializeFilters(toggleValue(EMPTY_FILTERS, facet, String(value))).toString()}`;
}

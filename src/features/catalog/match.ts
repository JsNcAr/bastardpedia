import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { FACETS, resolvedSort, type Facet, type Filters } from './filter-model';

/**
 * Pure filtering. AND across facets, OR within a facet:
 *   theme matches the primary or any secondary theme;
 *   country matches origin or setting;
 *   era, century and continent match the build-time derived fields.
 * Stories carrying any hidden content warning are dropped.
 */

export function facetValues(story: CatalogStory, facet: Facet): string[] {
  switch (facet) {
    case 'format':
      return [story.format];
    case 'theme':
      return [story.themes.primary, ...story.themes.secondary];
    case 'role':
      return story.roles;
    case 'continent':
      return story.derived.continents;
    case 'country':
      return [...new Set([...story.regions.origin, ...story.regions.setting])];
    case 'era':
      return story.derived.eras;
    case 'century':
      return story.derived.centuries.map(String);
  }
}

function selected(filters: Filters, facet: Facet): string[] {
  return facet === 'century' ? filters.century.map(String) : filters[facet];
}

function matchesFacet(story: CatalogStory, filters: Filters, facet: Facet): boolean {
  const want = selected(filters, facet);
  if (want.length === 0) return true;
  const have = facetValues(story, facet);
  return want.some((v) => have.includes(v));
}

function passesWarnings(story: CatalogStory, filters: Filters) {
  return !story.content_warnings.some((w) => filters.cwHide.includes(w));
}

/** `matches` is the search result (id to score); null means no text query. */
function passes(
  story: CatalogStory,
  filters: Filters,
  matches: Map<string, number> | null,
  except?: Facet,
) {
  if (matches && !matches.has(story.id)) return false;
  if (!passesWarnings(story, filters)) return false;
  return FACETS.every((facet) => facet === except || matchesFacet(story, filters, facet));
}

const startYear = (s: CatalogStory) => s.time?.main_span.start ?? Number.POSITIVE_INFINITY;

export function filterStories(
  stories: readonly CatalogStory[],
  filters: Filters,
  matches: Map<string, number> | null = null,
): CatalogStory[] {
  const out = stories.filter((s) => passes(s, filters, matches));
  const sort = resolvedSort(filters);
  const byRelease = (a: CatalogStory, b: CatalogStory) =>
    b.first_published.localeCompare(a.first_published);
  switch (sort) {
    case 'relevance':
      if (matches) return out.sort((a, b) => (matches.get(b.id) ?? 0) - (matches.get(a.id) ?? 0));
      return out.sort(byRelease);
    case 'newest':
      return out.sort(byRelease);
    case 'oldest':
      return out.sort((a, b) => a.first_published.localeCompare(b.first_published));
    case 'chronological':
      return out.sort((a, b) => startYear(a) - startYear(b) || byRelease(a, b));
  }
}

/**
 * How many stories each option of each facet would give, holding every other
 * active filter fixed. Selecting an option with a count of N shows N results
 * (or more, for an option in a facet that already has a selection).
 */
export function facetCounts(
  stories: readonly CatalogStory[],
  filters: Filters,
  matches: Map<string, number> | null = null,
): Record<Facet, Map<string, number>> {
  const counts = Object.fromEntries(FACETS.map((f) => [f, new Map<string, number>()])) as Record<
    Facet,
    Map<string, number>
  >;
  for (const story of stories) {
    for (const facet of FACETS) {
      if (!passes(story, filters, matches, facet)) continue;
      const bucket = counts[facet];
      for (const v of facetValues(story, facet)) bucket.set(v, (bucket.get(v) ?? 0) + 1);
    }
  }
  return counts;
}

/** Per content warning: how many of the stories matching everything else carry it. */
export function warningCounts(
  stories: readonly CatalogStory[],
  filters: Filters,
  matches: Map<string, number> | null = null,
): Map<string, number> {
  const out = new Map<string, number>();
  const unhidden = { ...filters, cwHide: [] };
  for (const story of stories) {
    if (!passes(story, unhidden, matches)) continue;
    for (const w of story.content_warnings) out.set(w, (out.get(w) ?? 0) + 1);
  }
  return out;
}

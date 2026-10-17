import type { CatalogStory } from '@shared/schemas/catalog.ts';

/** Overlap of two sets as a share of their union, 0 to 1 (Jaccard). */
function share(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let both = 0;
  for (const x of A) if (B.has(x)) both++;
  return both / (A.size + B.size - both);
}

/**
 * Stories most like this one, for "More like this". A shared subject counts most
 * (6), then the same primary theme (3), then each theme the two have in common
 * (1.5). Named eras and places count by their share of overlap (up to 3 and 2):
 * long stories touch a dozen eras, and a raw count let them outrank everything.
 * Ties go to the newer story. Pure, so it is unit-tested.
 */
export function related(
  story: CatalogStory,
  stories: readonly CatalogStory[],
  limit = 5,
): CatalogStory[] {
  const subjectKey = (s: CatalogStory['subjects'][number]) => s.wikidata ?? s.name.toLowerCase();
  const subjects = new Set(story.subjects.map(subjectKey));
  const themes = new Set([story.themes.primary, ...story.themes.secondary]);
  const places = [...story.regions.origin, ...story.regions.setting];

  return stories
    .filter((s) => s.id !== story.id)
    .map((s) => ({
      s,
      score:
        6 * new Set(s.subjects.map(subjectKey).filter((k) => subjects.has(k))).size +
        (s.themes.primary === story.themes.primary ? 3 : 0) +
        1.5 * [s.themes.primary, ...s.themes.secondary].filter((t) => themes.has(t)).length +
        3 * share(s.derived.eras, story.derived.eras) +
        2 * share([...s.regions.origin, ...s.regions.setting], places),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.s.first_published.localeCompare(a.s.first_published))
    .slice(0, limit)
    .map((r) => r.s);
}

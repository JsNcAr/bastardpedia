import type { CatalogStory } from '@shared/schemas/catalog.ts';
import type { LibraryEntry } from '@/data';

export const LIBRARY_SORTS = ['changed', 'title', 'released'] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

export const parseLibrarySort = (value: string | null): LibrarySort =>
  (LIBRARY_SORTS as readonly string[]).includes(value ?? '') ? (value as LibrarySort) : 'changed';

/**
 * Library entries in the chosen order: most recently changed, by title, or newest
 * release first. Entries whose story is no longer in the catalogue go last.
 */
export function sortEntries(
  entries: readonly LibraryEntry[],
  sort: LibrarySort,
  stories: ReadonlyMap<string, CatalogStory>,
): LibraryEntry[] {
  const byChange = (a: LibraryEntry, b: LibraryEntry) => b.updatedAt.localeCompare(a.updatedAt);
  return [...entries].sort((a, b) => {
    const sa = stories.get(a.id);
    const sb = stories.get(b.id);
    if (!sa || !sb) return sa ? -1 : sb ? 1 : byChange(a, b);
    if (sort === 'title') return sa.title.localeCompare(sb.title) || byChange(a, b);
    if (sort === 'released')
      return sb.first_published.localeCompare(sa.first_published) || byChange(a, b);
    return byChange(a, b);
  });
}

/** How far through the catalogue the visitor is. Only stories still in the catalogue count. */
export function libraryProgress(
  entries: readonly LibraryEntry[],
  stories: ReadonlyMap<string, CatalogStory>,
) {
  const present = entries.filter((e) => stories.has(e.id));
  return {
    total: stories.size,
    listened: present.filter((e) => e.status === 'listened').length,
    want: present.filter((e) => e.status === 'want').length,
    favourites: present.filter((e) => e.favourite).length,
  };
}

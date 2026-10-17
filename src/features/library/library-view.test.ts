import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { emptyEntry } from '@/data';
import { sampleCatalog } from '@/test/catalog';
import { libraryProgress, parseLibrarySort, sortEntries } from './library-view';

const stories = new Map<string, CatalogStory>(sampleCatalog.stories.map((s) => [s.id, s]));
const at = (id: string, iso: string, over = {}) => ({
  ...emptyEntry(id, iso),
  updatedAt: iso,
  ...over,
});

describe('library view', () => {
  const entries = [
    at('sample-percy-fawcett', '2026-01-01T00:00:00.000Z', { status: 'listened' as const }),
    at('sample-heinrich-schliemann', '2026-03-01T00:00:00.000Z', { status: 'want' as const }),
    at('gone-story', '2026-04-01T00:00:00.000Z', { favourite: true }),
    at('sample-nestle', '2026-02-01T00:00:00.000Z', { favourite: true }),
  ];

  it('sorts by change, title or release, with missing stories last', () => {
    expect(sortEntries(entries, 'changed', stories).map((e) => e.id)).toEqual([
      'sample-heinrich-schliemann',
      'sample-nestle',
      'sample-percy-fawcett',
      'gone-story',
    ]);
    const byTitle = sortEntries(entries, 'title', stories).map((e) => stories.get(e.id)?.title);
    expect(byTitle.slice(0, 3)).toEqual(
      [...byTitle.slice(0, 3)].sort((a, b) => a!.localeCompare(b!)),
    );
    expect(sortEntries(entries, 'released', stories).at(-1)?.id).toBe('gone-story');
  });

  it('counts progress over stories still in the catalogue', () => {
    expect(libraryProgress(entries, stories)).toEqual({
      total: sampleCatalog.stories.length,
      listened: 1,
      want: 1,
      favourites: 1,
    });
  });

  it('falls back to the default sort', () => {
    expect(parseLibrarySort('title')).toBe('title');
    expect(parseLibrarySort('bogus')).toBe('changed');
    expect(parseLibrarySort(null)).toBe('changed');
  });
});

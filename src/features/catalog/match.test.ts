import { sampleCatalog } from '@/test/catalog';
import { facetCounts, filterStories, listenedCount, reviewedCount, warningCounts } from './match';
import { EMPTY_FILTERS, type Filters } from './filter-model';
import { createStorySearch } from './search';

const stories = sampleCatalog.stories;
const ids = (f: Partial<Filters>, matches: Map<string, number> | null = null) =>
  filterStories(stories, { ...EMPTY_FILTERS, ...f }, matches).map((s) => s.id);

describe('filterStories', () => {
  it('returns everything with no filters, newest release first', () => {
    const out = ids({});
    expect(out).toHaveLength(stories.length);
    expect(out[0]).toBe('sample-heinrich-schliemann');
  });

  it('Victorian explorers: Schliemann, Stanley and Fawcett (covered years)', () => {
    const out = ids({ era: ['victorian'], role: ['explorer-adventurer'] });
    expect(out.sort()).toEqual([
      'sample-heinrich-schliemann',
      'sample-henry-morton-stanley',
      'sample-percy-fawcett',
    ]);
  });

  it('applies a regional era only to stories tied to its region', () => {
    expect(ids({ era: ['meiji'] })).toEqual([]);
    expect(ids({ era: ['third-reich'] })).not.toContain('sample-l-ron-hubbard');
  });

  it('the 20th century includes Fawcett', () => {
    expect(ids({ century: [20] })).toContain('sample-percy-fawcett');
  });

  it('is OR within a facet and AND across facets', () => {
    expect(ids({ era: ['victorian', 'contemporary'] }).sort()).toEqual([
      'sample-andrew-tate-update',
      'sample-heinrich-schliemann',
      'sample-henry-morton-stanley',
      'sample-nestle',
      'sample-percy-fawcett',
      'sample-steven-seagal-book',
    ]);
    expect(ids({ era: ['victorian', 'contemporary'], role: ['explorer-adventurer'] })).toHaveLength(
      3,
    );
  });

  it('matches secondary themes', () => {
    expect(ids({ theme: ['occult-esoteric'] })).toEqual(['sample-percy-fawcett']);
  });

  it('matches countries by origin or setting, and continents', () => {
    expect(ids({ country: ['BR'] })).toEqual(['sample-percy-fawcett']);
    expect(ids({ country: ['GB'] })).toContain('sample-henry-morton-stanley');
    expect(ids({ continent: ['Africa'] }).sort()).toEqual([
      'sample-henry-morton-stanley',
      'sample-nestle',
    ]);
  });

  it('filters by format', () => {
    expect(ids({ format: ['media-reading'] })).toEqual(['sample-steven-seagal-book']);
  });

  it('hides stories carrying a hidden content warning', () => {
    const out = ids({ cwHide: ['graphic-violence'] });
    expect(out).not.toContain('sample-henry-morton-stanley');
    expect(out).not.toContain('sample-triangle-shirtwaist-fire');
    expect(out).toHaveLength(stories.length - 2);
  });

  it('sorts chronologically by the start of the main events', () => {
    const out = ids({ sort: 'chronological' });
    expect(out.slice(0, 3)).toEqual([
      'sample-heinrich-schliemann',
      'sample-henry-morton-stanley',
      'sample-percy-fawcett',
    ]);
  });

  it('sorts by oldest release', () => {
    expect(ids({ sort: 'oldest' })[0]).toBe('sample-l-ron-hubbard');
  });

  it('keeps only reviewed stories when asked, and counts them', () => {
    const out = ids({ reviewedOnly: true });
    expect(out).toHaveLength(4);
    expect(out).not.toContain('sample-percy-fawcett');
    expect(reviewedCount(stories, { ...EMPTY_FILTERS, reviewedOnly: true })).toBe(4);
    expect(reviewedCount(stories, { ...EMPTY_FILTERS, role: ['explorer-adventurer'] })).toBe(2);
  });

  it('hides listened stories only when asked, and counts them', () => {
    const listened = new Set(['sample-percy-fawcett', 'sample-nestle']);
    const all = filterStories(stories, EMPTY_FILTERS, null, listened).map((s) => s.id);
    expect(all).toContain('sample-percy-fawcett');
    const hidden = filterStories(stories, { ...EMPTY_FILTERS, hideListened: true }, null, listened);
    expect(hidden.map((s) => s.id)).not.toContain('sample-percy-fawcett');
    expect(hidden).toHaveLength(stories.length - 2);
    expect(listenedCount(stories, { ...EMPTY_FILTERS, hideListened: true }, null, listened)).toBe(
      2,
    );
    expect(
      listenedCount(stories, { ...EMPTY_FILTERS, role: ['explorer-adventurer'] }, null, listened),
    ).toBe(1);
  });

  it('matches a year range by overlap with the covered years', () => {
    expect(ids({ yearFrom: 1926, yearTo: 1950 }).sort()).toEqual([
      'sample-l-ron-hubbard',
      'sample-nestle',
    ]);
    expect(ids({ yearTo: 1830 })).toEqual(['sample-heinrich-schliemann']);
    expect(ids({ yearFrom: 2022 })).toEqual(['sample-andrew-tate-update']);
  });
});

describe('search', () => {
  const search = createStorySearch(stories);

  it('returns null for an empty query', () => {
    expect(search.run('  ')).toBeNull();
  });

  it('finds by keyword, subject name and prefix, and orders by relevance', () => {
    expect(ids({ q: 'troy' }, search.run('troy'))[0]).toBe('sample-heinrich-schliemann');
    expect(ids({ q: 'hubb' }, search.run('hubb'))).toEqual(['sample-l-ron-hubbard']);
    expect(ids({ q: 'lost city' }, search.run('lost city'))).toEqual(['sample-percy-fawcett']);
  });

  it('tolerates a typo', () => {
    expect(ids({ q: 'schliman' }, search.run('schliman'))).toContain('sample-heinrich-schliemann');
  });

  it('combines with facets', () => {
    expect(ids({ q: 'congo', era: ['contemporary'] }, search.run('congo'))).toEqual([]);
  });
});

describe('facetCounts', () => {
  it('counts each option holding the other facets fixed', () => {
    const counts = facetCounts(stories, { ...EMPTY_FILTERS, role: ['explorer-adventurer'] });
    // Era counts respect the role filter.
    expect(counts.era.get('victorian')).toBe(3);
    expect(counts.era.get('edwardian')).toBe(2);
    // Role counts ignore the role filter itself, so other roles stay selectable.
    expect(counts.role.get('cult-leader')).toBe(1);
    expect(counts.role.get('explorer-adventurer')).toBe(3);
  });

  it('a count equals the results of selecting that option alone', () => {
    const counts = facetCounts(stories, EMPTY_FILTERS);
    for (const [era, n] of counts.era) {
      expect(ids({ era: [era] })).toHaveLength(n);
    }
  });

  it('counts content warnings among otherwise-matching stories', () => {
    const w = warningCounts(stories, { ...EMPTY_FILTERS, cwHide: ['graphic-violence'] });
    expect(w.get('graphic-violence')).toBe(2);
  });
});

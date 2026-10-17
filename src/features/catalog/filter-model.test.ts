import {
  EMPTY_FILTERS,
  activeCount,
  parseFilters,
  resolvedSort,
  serializeFilters,
  tagSearch,
  toggleHiddenWarning,
  toggleValue,
} from './filter-model';

describe('filter model and URL', () => {
  it('parses repeated params, trims, dedupes and upper-cases countries', () => {
    const f = parseFilters(
      new URLSearchParams(
        'q=%20troy%20&theme=a&theme=a&theme=b&country=gb&century=19&century=x&century=0&cw-hide=torture&sort=oldest',
      ),
    );
    expect(f.q).toBe('troy');
    expect(f.theme).toEqual(['a', 'b']);
    expect(f.country).toEqual(['GB']);
    expect(f.century).toEqual([19]);
    expect(f.cwHide).toEqual(['torture']);
    expect(f.sort).toBe('oldest');
  });

  it('ignores an unknown sort', () => {
    expect(parseFilters(new URLSearchParams('sort=random')).sort).toBeNull();
  });

  it('round-trips through the URL', () => {
    const f = {
      ...EMPTY_FILTERS,
      q: 'congo',
      era: ['victorian'],
      century: [-1, 19],
      role: ['explorer-adventurer'],
      cwHide: ['torture'],
      reviewedOnly: true,
      yearFrom: -500,
      yearTo: 1900,
      sort: 'chronological' as const,
    };
    expect(parseFilters(serializeFilters(f))).toEqual(f);
  });

  it('serializes equal filters to equal strings, empties omitted', () => {
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('');
    const a = toggleValue(
      toggleValue(EMPTY_FILTERS, 'era', 'victorian'),
      'role',
      'explorer-adventurer',
    );
    expect(serializeFilters(a).toString()).toBe('era=victorian&role=explorer-adventurer');
  });

  it('toggles values on and off, including centuries', () => {
    const on = toggleValue(EMPTY_FILTERS, 'century', '19');
    expect(on.century).toEqual([19]);
    expect(toggleValue(on, 'century', '19').century).toEqual([]);
    const w = toggleHiddenWarning(EMPTY_FILTERS, 'torture');
    expect(toggleHiddenWarning(w, 'torture').cwHide).toEqual([]);
  });

  it('counts active filters and picks the automatic sort', () => {
    const f = { ...EMPTY_FILTERS, q: 'x', theme: ['a', 'b'], cwHide: ['c'] };
    expect(activeCount(f)).toBe(4);
    expect(resolvedSort(f)).toBe('relevance');
    expect(resolvedSort(EMPTY_FILTERS)).toBe('newest');
  });

  it('reads the year range, swapping a reversed one and dropping junk', () => {
    const f = parseFilters(new URLSearchParams('from=1900&to=1800&reviewed=1'));
    expect([f.yearFrom, f.yearTo, f.reviewedOnly]).toEqual([1800, 1900, true]);
    const junk = parseFilters(new URLSearchParams('from=abc&to=&reviewed=yes'));
    expect([junk.yearFrom, junk.yearTo, junk.reviewedOnly]).toEqual([null, null, false]);
    expect(activeCount({ ...EMPTY_FILTERS, yearFrom: 1800, reviewedOnly: true })).toBe(2);
  });

  it('reads and writes Hide listened', () => {
    const f = parseFilters(new URLSearchParams('hide-listened=1'));
    expect(f.hideListened).toBe(true);
    expect(serializeFilters(f).toString()).toBe('hide-listened=1');
    expect(activeCount(f)).toBe(1);
    expect(parseFilters(new URLSearchParams('hide-listened=yes')).hideListened).toBe(false);
  });

  it('keeps the timeline view in the URL without counting it as a filter', () => {
    const f = parseFilters(new URLSearchParams('view=timeline'));
    expect(f.view).toBe('timeline');
    expect(serializeFilters(f).toString()).toBe('view=timeline');
    expect(serializeFilters(EMPTY_FILTERS).toString()).toBe('');
    expect(activeCount(f)).toBe(0);
    expect(resolvedSort(f)).toBe('chronological');
    expect(resolvedSort({ ...f, q: 'x' })).toBe('relevance');
    expect(parseFilters(new URLSearchParams('view=grid')).view).toBe('list');
  });

  it('builds a fresh search link for a tag', () => {
    expect(tagSearch('theme', 'cults-new-religions')).toBe('/?theme=cults-new-religions');
    expect(tagSearch('century', 19)).toBe('/?century=19');
  });
});

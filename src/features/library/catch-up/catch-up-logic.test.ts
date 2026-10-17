import { sampleCatalog } from '@/test/catalog';
import {
  byYear,
  monthBins,
  monthLabel,
  monthOf,
  monthRange,
  monthValue,
  parseMonth,
  releaseBounds,
  storiesFor,
  totals,
  type CatchUpChoice,
} from './catch-up-logic';

const stories = sampleCatalog.stories;
const { first, last } = releaseBounds(stories);
const choice = (c: Partial<CatchUpChoice>): CatchUpChoice => ({
  preset: 'all',
  from: first,
  to: last,
  skipFormats: new Set(),
  ...c,
});
const ids = (c: CatchUpChoice) => storiesFor(stories, c, first, last).map((s) => s.id);

describe('catch-up logic', () => {
  it('turns release dates into months and back', () => {
    expect(monthOf('2018-08-07T10:00:00+00:00')).toBe(2018 * 12 + 7);
    expect(monthValue(monthOf('2019-03-01'))).toBe('2019-03');
    expect(parseMonth('2019-03')).toBe(monthOf('2019-03-01'));
    expect(parseMonth('2019-13')).toBeNull();
    expect(parseMonth('')).toBeNull();
    expect(monthLabel(monthOf('2019-03-01'))).toBe('Mar 2019');
    expect([monthValue(first), monthValue(last)]).toEqual(['2018-08', '2026-10']);
  });

  it('maps each preset to a month range', () => {
    const m = monthOf('2021-07-01');
    expect(monthRange(choice({ preset: 'all' }), first, last)).toEqual({ from: first, to: last });
    expect(monthRange(choice({ preset: 'until', to: m }), first, last)).toEqual({
      from: first,
      to: m,
    });
    expect(monthRange(choice({ preset: 'since', from: m }), first, last)).toEqual({
      from: m,
      to: last,
    });
    expect(monthRange(choice({ preset: 'between', from: m, to: first }), first, last)).toEqual({
      from: first,
      to: m,
    });
  });

  it('picks the stories a choice covers, oldest first, leaving out skipped formats', () => {
    const upTo = choice({ preset: 'until', to: monthOf('2021-07-01') });
    expect(ids(upTo)).toEqual([
      'sample-l-ron-hubbard',
      'sample-henry-morton-stanley',
      'sample-triangle-shirtwaist-fire',
      'sample-steven-seagal-book',
    ]);
    expect(ids({ ...upTo, skipFormats: new Set(['media-reading']) })).toHaveLength(3);
    expect(ids(choice({ preset: 'since', from: monthOf('2023-01-01') }))).toEqual([
      'sample-andrew-tate-update',
      'sample-percy-fawcett',
      'sample-heinrich-schliemann',
    ]);
  });

  it('bins stories by month, groups them by year and adds them up', () => {
    const bins = monthBins(stories, first, last);
    expect(bins).toHaveLength(last - first + 1);
    expect(bins.reduce((n, b) => n + b.count, 0)).toBe(stories.length);
    const all = storiesFor(stories, choice({}), first, last);
    expect(byYear(all).map(([year, list]) => [year, list.length])).toEqual([
      [2018, 1],
      [2020, 1],
      [2021, 3],
      [2023, 1],
      [2026, 2],
    ]);
    expect(totals(all)).toEqual({ stories: 8, episodes: 13, hours: 14 });
  });
});

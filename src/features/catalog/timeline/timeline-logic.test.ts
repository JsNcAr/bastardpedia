import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { sampleCatalog } from '@/test/catalog';
import { MIN_SPAN, WIDTH, clip, domainFor, niceStep, offAxis, ticks, toX, toYear } from './axis';
import { rangeFromDrag } from './brush';
import { binSize, bins } from './density';

const base = sampleCatalog.stories[0]!;
const span = (id: string, start: number, end: number): CatalogStory => ({
  ...base,
  id,
  time: {
    main_span: { start, end },
    covered_span: { start, end },
    reaches_present: false,
    approximate: false,
  },
});
const none = { yearFrom: null, yearTo: null };

describe('timeline axis', () => {
  it('fits the shown stories, leaving out far outliers at the start', () => {
    const many = Array.from({ length: 100 }, (_, i) => span(`s${String(i)}`, 1800 + i, 1900 + i));
    const withOutlier = [span('ancient', -5000, -4900), ...many];
    expect(domainFor(withOutlier, none, 2026)).toEqual({ start: 1800, end: 1999 });
    // A small result set: a fixed percentile would keep its one outlier.
    const few = [span('ancient', -5000, -4900), ...many.slice(0, 20)];
    expect(domainFor(few, none, 2026).start).toBe(1800);
    // A wide but even spread has no outliers to leave out.
    const spread = [span('a', 1000, 1100), span('b', 1400, 1500), span('c', 1800, 1900)];
    expect(domainFor(spread, none, 2026).start).toBe(1000);
  });

  it('uses the year filter as the axis ends, padded to a minimum span', () => {
    expect(domainFor(sampleCatalog.stories, { yearFrom: 1850, yearTo: 1950 }, 2026)).toEqual({
      start: 1850,
      end: 1950,
    });
    const d = domainFor(sampleCatalog.stories, { yearFrom: 1900, yearTo: 1904 }, 2026);
    expect(d.end - d.start).toBeGreaterThanOrEqual(MIN_SPAN);
  });

  it('maps years to x and back', () => {
    const d = { start: 1800, end: 2000 };
    expect(toX(1800, d)).toBe(0);
    expect(toX(2000, d)).toBe(WIDTH);
    expect(toYear(WIDTH / 2, d)).toBe(1900);
    expect(toYear(-50, d)).toBe(1800);
  });

  it('clips spans to the axis and flags the edges they run off', () => {
    const d = { start: 1800, end: 2000 };
    expect(clip({ start: 1700, end: 1900 }, d)).toEqual({
      x: 0,
      width: 500,
      clippedStart: true,
      clippedEnd: false,
    });
    expect(clip({ start: 1950, end: 2100 }, d)?.clippedEnd).toBe(true);
    expect(clip({ start: 1500, end: 1600 }, d)).toBeNull();
    expect(offAxis({ start: 1500, end: 1600 }, d)).toBe('before');
    expect(offAxis({ start: 2010, end: 2020 }, d)).toBe('after');
    expect(offAxis({ start: 1700, end: 1900 }, d)).toBeNull();
  });

  it('picks nice tick steps across scales, BCE included', () => {
    expect(niceStep(200, 7)).toBe(50);
    expect(niceStep(7000, 7)).toBe(1000);
    expect(ticks({ start: 1800, end: 2026 })).toEqual([1800, 1850, 1900, 1950, 2000]);
    expect(ticks({ start: -500, end: 500 })).toEqual([-400, -200, 0, 200, 400]);
  });
});

describe('density', () => {
  it('counts stories by overlap with each bin', () => {
    const d = { start: 1900, end: 1950 };
    const out = bins([span('a', 1905, 1925), span('b', 1920, 1921), span('c', 1800, 1850)], d, 10);
    expect(out.map((b) => [b.start, b.count])).toEqual([
      [1900, 1],
      [1910, 1],
      [1920, 2],
      [1930, 0],
      [1940, 0],
    ]);
    expect(binSize({ start: 1600, end: 2026 })).toBe(10);
  });
});

describe('brush', () => {
  const d = { start: 1900, end: 2000 };
  const list = bins([], d, 10);

  it('turns a drag either way into a year range', () => {
    expect(rangeFromDrag(100, 500, d, list)).toEqual({ from: 1910, to: 1950 });
    expect(rangeFromDrag(500, 100, d, list)).toEqual({ from: 1910, to: 1950 });
  });

  it('treats a tiny drag as a click on a bin', () => {
    expect(rangeFromDrag(255, 257, d, list)).toEqual({ from: 1920, to: 1929 });
  });
});

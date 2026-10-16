// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { centuriesOf, centuryLabel, centuryOf, countryInfo, erasOf, regionsOf } from './derive.ts';

const ERAS = [
  { id: 'victorian', start: 1837, end: 1901 },
  { id: 'edwardian', start: 1901, end: 1914 },
  { id: 'interwar', start: 1918, end: 1939 },
  { id: 'roman-republic', start: -509, end: -27 },
  { id: 'contemporary', start: 2010, end: null },
];

describe('centuries', () => {
  it('maps years to centuries without a year 0', () => {
    expect(centuryOf(1900)).toBe(19);
    expect(centuryOf(1901)).toBe(20);
    expect(centuryOf(-1)).toBe(-1);
    expect(centuryOf(-100)).toBe(-1);
    expect(centuryOf(-149)).toBe(-2);
  });
  it('lists every century a span touches', () => {
    expect(centuriesOf({ start: 1890, end: 1910 })).toEqual([19, 20]);
    expect(centuriesOf({ start: -149, end: -146 })).toEqual([-2]);
    expect(centuriesOf({ start: -50, end: 30 })).toEqual([-1, 1]);
    expect(centuriesOf({ start: 2015, end: null }, 2026)).toEqual([21]);
  });
  it('labels centuries', () => {
    expect(centuryLabel(19)).toBe('19th century');
    expect(centuryLabel(21)).toBe('21st century');
    expect(centuryLabel(11)).toBe('11th century');
    expect(centuryLabel(-1)).toBe('1st century BCE');
  });
});

describe('eras', () => {
  it('Fawcett 1906-1925 is Edwardian and interwar, not Victorian', () => {
    expect(erasOf({ start: 1906, end: 1925 }, ERAS)).toEqual(['edwardian', 'interwar']);
  });
  it('Schliemann ~1846-1890 is Victorian', () => {
    expect(erasOf({ start: 1846, end: 1890 }, ERAS)).toEqual(['victorian']);
  });
  it('handles BCE spans', () => {
    expect(erasOf({ start: -149, end: -146 }, ERAS)).toEqual(['roman-republic']);
  });
  it('treats open eras and open spans as running to now', () => {
    expect(erasOf({ start: 2016, end: null }, ERAS, 2026)).toEqual(['contemporary']);
  });
});

describe('regions', () => {
  it('looks up continents and subregions', () => {
    expect(countryInfo('BR')?.continent).toBe('Americas');
    expect(regionsOf(['GB', 'BR', 'BO', 'XX'])).toEqual({
      continents: ['Americas', 'Europe'],
      subregions: ['Northern Europe', 'South America'],
    });
  });
});

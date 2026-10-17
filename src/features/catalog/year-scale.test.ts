import { STEPS, parseYear, stepAt, yearAt, yearBounds } from './year-scale';

describe('year scale', () => {
  it('maps the ends of the slider to the bounds', () => {
    expect(yearAt(0, -5000, 2026)).toBe(-5000);
    expect(yearAt(STEPS, -5000, 2026)).toBe(2026);
  });

  it('gives recent centuries most of the travel', () => {
    // The Victorian era sits well past the middle of the slider.
    expect(stepAt(1837, -5000, 2026)).toBeGreaterThan(STEPS * 0.6);
    expect(yearAt(STEPS - 1, -5000, 2026)).toBeGreaterThan(2020);
  });

  it('round-trips a year to within a step', () => {
    for (const y of [-3000, 0, 1066, 1837, 1945, 2020]) {
      expect(Math.abs(yearAt(stepAt(y, -5000, 2026), -5000, 2026) - y)).toBeLessThan(25);
    }
  });

  it('derives bounds from covered spans', () => {
    expect(
      yearBounds([{ start: 1822, end: 1890 }, undefined, { start: -149, end: -146 }], 2026),
    ).toEqual({
      min: -200,
      max: 2026,
    });
  });
});

describe('parseYear', () => {
  it('reads plain, negative and BCE years', () => {
    expect(parseYear('1837')).toBe(1837);
    expect(parseYear('-149')).toBe(-149);
    expect(parseYear('149 BCE')).toBe(-149);
    expect(parseYear('44 bc')).toBe(-44);
    expect(parseYear('1066 CE')).toBe(1066);
  });
  it('returns null for empty or invalid input', () => {
    expect(parseYear('')).toBeNull();
    expect(parseYear('around 1870')).toBeNull();
  });
});

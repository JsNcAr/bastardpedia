import { centuryLabel, formatDuration, formatSpan, partsLabel } from './format';

describe('formatting', () => {
  it('formats spans across eras', () => {
    expect(formatSpan({ start: 1846, end: 1890 })).toBe('1846 to 1890');
    expect(formatSpan({ start: -149, end: -146 })).toBe('149 BCE to 146 BCE');
    expect(formatSpan({ start: -27, end: 476 })).toBe('27 BCE to 476 CE');
    expect(formatSpan({ start: 2022, end: null })).toBe('2022 to present');
    expect(formatSpan({ start: 2021, end: 2021 })).toBe('2021');
    expect(formatSpan({ start: 1870, end: 1890 }, true)).toBe('c. 1870 to 1890');
    expect(formatSpan({ start: null, end: null })).toBe('Dates unknown');
  });

  it('labels centuries', () => {
    expect(centuryLabel(19)).toBe('19th century');
    expect(centuryLabel(21)).toBe('21st century');
    expect(centuryLabel(11)).toBe('11th century');
    expect(centuryLabel(-1)).toBe('1st century BCE');
    expect(centuryLabel(-3)).toBe('3rd century BCE');
  });

  it('formats durations and part counts', () => {
    expect(formatDuration(9000)).toBe('2 h 30 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(2400)).toBe('40 min');
    expect(partsLabel(1)).toBe('1 part');
    expect(partsLabel(3)).toBe('3 parts');
  });
});

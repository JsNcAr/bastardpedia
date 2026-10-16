// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { namesMatch, normalizeName } from './verify-wikidata.ts';

describe('wikidata name matching', () => {
  it('ignores case, diacritics and punctuation', () => {
    expect(normalizeName('Martin Niemöller')).toBe('martin niemoller');
    expect(namesMatch('Radovan Karadzic', ['Radovan Karadžić'])).toBe(true);
    expect(namesMatch('L. Ron Hubbard', ['L Ron Hubbard'])).toBe(true);
  });
  it('accepts aliases and rejects other names', () => {
    expect(namesMatch('Percy Fawcett', ['Percy Harrison Fawcett', 'Percy Fawcett'])).toBe(true);
    expect(namesMatch('Percy Fawcett', ['Henry Morton Stanley'])).toBe(false);
  });
});

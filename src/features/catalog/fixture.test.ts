import { CatalogSchema } from '@shared/schemas/catalog.ts';
import raw from '@/test/fixtures/catalog.sample.json';

describe('sample catalog fixture', () => {
  it('validates against the catalog schema', () => {
    const parsed = CatalogSchema.safeParse(raw);
    expect(parsed.error).toBeUndefined();
  });

  it('marks every story as sample data', () => {
    const parsed = CatalogSchema.parse(raw);
    for (const s of parsed.stories) {
      expect(s.id.startsWith('sample-')).toBe(true);
      expect(s.summary.endsWith('(sample data)')).toBe(true);
    }
  });

  it('only uses vocabulary ids the catalog defines', () => {
    const c = CatalogSchema.parse(raw);
    const ids = (terms: { id: string }[]) => new Set(terms.map((t) => t.id));
    const themes = ids(c.vocab.themes);
    const roles = ids(c.vocab.roles);
    const eras = ids(c.eras);
    const countries = new Set(c.countries.map((x) => x.code));
    for (const s of c.stories) {
      for (const t of [s.themes.primary, ...s.themes.secondary]) expect(themes.has(t)).toBe(true);
      for (const r of s.roles) expect(roles.has(r)).toBe(true);
      for (const e of s.derived.eras) expect(eras.has(e)).toBe(true);
      for (const x of [...s.regions.origin, ...s.regions.setting])
        expect(countries.has(x)).toBe(true);
    }
  });
});

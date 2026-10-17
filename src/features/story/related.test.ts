import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { sampleCatalog } from '@/test/catalog';
import { related } from './related';

const base = sampleCatalog.stories[0]!;
const story = (id: string, over: Partial<CatalogStory>): CatalogStory => ({
  ...base,
  id,
  subjects: [],
  themes: { primary: 'nothing-shared', secondary: [] },
  regions: { ...base.regions, origin: [], setting: [] },
  derived: { ...base.derived, eras: [] },
  ...over,
});

describe('related stories', () => {
  const me = story('me', {
    subjects: [{ name: 'Henry Kissinger', kind: 'person', role: 'primary', wikidata: 'Q66107' }],
    themes: { primary: 'diplomacy-foreign-policy', secondary: ['war-war-crimes'] },
  });

  it('ranks a shared subject above a shared theme, and leaves out unrelated ones', () => {
    const sameSubject = story('same-subject', {
      subjects: [{ name: 'Kissinger', kind: 'person', role: 'secondary', wikidata: 'Q66107' }],
    });
    const sameTheme = story('same-theme', {
      themes: { primary: 'diplomacy-foreign-policy', secondary: [] },
    });
    const unrelated = story('unrelated', {});
    expect(related(me, [unrelated, sameTheme, sameSubject, me]).map((s) => s.id)).toEqual([
      'same-subject',
      'same-theme',
    ]);
  });

  it('does not let a long story win on shared eras alone', () => {
    const eras = Array.from({ length: 12 }, (_, i) => `era-${String(i)}`);
    const wide = story('wide', { derived: { ...base.derived, eras } });
    const meWide = { ...me, derived: { ...base.derived, eras } };
    const sameTheme = story('same-theme', {
      themes: { primary: 'diplomacy-foreign-policy', secondary: [] },
    });
    expect(related(meWide, [wide, sameTheme]).map((s) => s.id)).toEqual(['same-theme', 'wide']);
  });

  it('breaks ties by the newer release and respects the limit', () => {
    const older = story('older', {
      themes: { primary: 'diplomacy-foreign-policy', secondary: [] },
      first_published: '2019-01-01T00:00:00Z',
    });
    const newer = story('newer', {
      themes: { primary: 'diplomacy-foreign-policy', secondary: [] },
      first_published: '2024-01-01T00:00:00Z',
    });
    expect(related(me, [older, newer]).map((s) => s.id)).toEqual(['newer', 'older']);
    expect(related(me, [older, newer], 1).map((s) => s.id)).toEqual(['newer']);
  });

  it('works on the sample catalogue without returning the story itself', () => {
    const [first] = sampleCatalog.stories;
    expect(related(first!, sampleCatalog.stories).map((s) => s.id)).not.toContain(first!.id);
  });
});

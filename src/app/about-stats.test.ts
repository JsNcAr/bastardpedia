import { sampleCatalog } from '@/test/catalog';
import { aboutStats } from './about-stats';

describe('about stats', () => {
  it('summarises the catalogue', () => {
    const s = aboutStats(sampleCatalog);
    expect(s.stories).toBe(sampleCatalog.stories.length);
    expect(s.episodes).toBe(sampleCatalog.stories.reduce((n, x) => n + x.parts.length, 0));
    expect(s.reviewed).toBe(4);
    expect(s.earliest).toBe(1822);
    expect(s.latest).toBe(2023);
    expect(s.themes).toBeGreaterThan(0);
    expect(s.hours).toBeGreaterThan(0);
  });
});

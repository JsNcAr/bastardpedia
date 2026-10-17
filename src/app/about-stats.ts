import type { Catalog } from '@shared/schemas/catalog.ts';

export interface AboutStats {
  stories: number;
  episodes: number;
  hours: number;
  reviewed: number;
  earliest: number | null;
  latest: number | null;
  themes: number;
}

/** The catalogue in a few numbers, for the About page. */
export function aboutStats(catalog: Catalog): AboutStats {
  const spans = catalog.stories.flatMap((s) => (s.time ? [s.time.covered_span] : []));
  const themes = new Set(catalog.stories.flatMap((s) => [s.themes.primary, ...s.themes.secondary]));
  return {
    stories: catalog.stories.length,
    episodes: catalog.stories.reduce((n, s) => n + s.parts.length, 0),
    hours: Math.round(catalog.stories.reduce((n, s) => n + s.total_duration_s, 0) / 3600),
    reviewed: catalog.stories.filter((s) => s.review.status === 'reviewed').length,
    earliest: spans.length ? Math.min(...spans.map((s) => s.start)) : null,
    latest: spans.length ? Math.max(...spans.map((s) => s.end)) : null,
    themes: themes.size,
  };
}

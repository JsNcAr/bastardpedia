import MiniSearch from 'minisearch';
import type { CatalogStory } from '@shared/schemas/catalog.ts';

/** Full-text search over title, summary, subject names, keywords and guests. */
export interface StorySearch {
  /** Story id to score, or null for an empty query. */
  run(query: string): Map<string, number> | null;
}

interface Doc {
  id: string;
  title: string;
  summary: string;
  subjects: string;
  keywords: string;
  guests: string;
}

export function createStorySearch(stories: readonly CatalogStory[]): StorySearch {
  const index = new MiniSearch<Doc>({
    fields: ['title', 'summary', 'subjects', 'keywords', 'guests'],
    searchOptions: {
      prefix: true,
      fuzzy: 0.2,
      combineWith: 'AND',
      boost: { title: 3, subjects: 2.5, keywords: 1.5 },
    },
  });
  index.addAll(
    stories.map((s) => ({
      id: s.id,
      title: s.title,
      summary: s.summary,
      subjects: s.subjects.map((x) => x.name).join(' '),
      keywords: s.keywords.join(' '),
      guests: s.guests.join(' '),
    })),
  );
  return {
    run(query) {
      const q = query.trim();
      if (!q) return null;
      return new Map(index.search(q).map((r) => [String(r.id), r.score]));
    },
  };
}

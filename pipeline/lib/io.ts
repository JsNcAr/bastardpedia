import { readFileSync, existsSync } from 'node:fs';
import { z } from 'zod';
import {
  EpisodeSchema,
  StorySchema,
  type Episode,
  type Story,
} from '../../shared/schemas/episode.ts';
import { EPISODES_FILE, STORIES_FILE } from './paths.ts';

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8')) as unknown;
}

/**
 * JSON formatted like Python's json.dumps(indent=2, ensure_ascii=False), which the
 * phase-0 scripts wrote. JSON.stringify produces the same bytes for this data.
 */
export function toJson(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function loadEpisodes(): Episode[] {
  if (!existsSync(EPISODES_FILE))
    throw new Error('data/episodes.json is missing: run npm run pipeline:ingest');
  return z.array(EpisodeSchema).parse(readJson(EPISODES_FILE));
}

export function loadStories(): Story[] {
  if (!existsSync(STORIES_FILE))
    throw new Error('data/stories.json is missing: run npm run pipeline:group');
  return z.array(StorySchema).parse(readJson(STORIES_FILE));
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

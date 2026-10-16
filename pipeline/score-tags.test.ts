// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import { scoreStory } from './score-tags.ts';

const gold = JSON.parse(
  readFileSync(join(import.meta.dirname, 'fixtures', 'valid.json'), 'utf8'),
) as StoryTags;
const copy = (): StoryTags => structuredClone(gold);

describe('scoreStory', () => {
  it('matches a record against itself on every key field', () => {
    const s = scoreStory(copy(), gold);
    expect(Object.values(s.key).every((f) => f.ok)).toBe(true);
    expect(s.overlap.theme_secondary).toBe(1);
  });

  it('allows years within five and flags a different main theme', () => {
    const got = copy();
    if (!got.time) throw new Error('fixture needs time');
    got.time.covered_span = {
      start: got.time.covered_span.start + 5,
      end: got.time.covered_span.end,
    };
    got.time.main_span = { start: got.time.main_span.start + 6, end: got.time.main_span.end };
    got.themes.primary = 'occult-esoteric';
    const s = scoreStory(got, gold);
    expect(s.key.covered_years.ok).toBe(true);
    expect(s.key.main_years.ok).toBe(false);
    expect(s.key.theme_primary).toMatchObject({ ok: false, got: 'occult-esoteric' });
  });
});

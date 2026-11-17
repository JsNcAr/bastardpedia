// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { loadTaxonomy } from './taxonomy.ts';
import { scanRules, scanStory, scanText } from './warning-scan.ts';
import { scanSection } from '../packet.ts';

const taxonomy = loadTaxonomy();
const rules = scanRules(taxonomy);
const transcript = [
  '00:00:05\nSpeaker 1: We bought grapes and rapeseed oil at the store.',
  '00:01:10\nSpeaker 2: He was accused of rape in 1950, and of rape again later.',
  '00:02:00\nSpeaker 1: His brother took his own life that winter.',
  '00:03:30\nSpeaker 2: The pilots were in a dogfight over the channel.',
].join('\n\n');

describe('warning scan', () => {
  it('has a rule for every strict warning with patterns, and only for those', () => {
    const strict = taxonomy.contentWarnings.filter((w) => w.strict).map((w) => w.id);
    expect(rules.map((r) => r.id)).toEqual(strict);
    expect(strict).toEqual([
      'sexual-violence',
      'child-sexual-abuse',
      'child-abuse',
      'suicide-self-harm',
      'animal-cruelty',
    ]);
  });

  it('matches whole words only, once per paragraph, with timestamp and context', () => {
    const hits = scanText(transcript, 2, rules);
    expect(hits.map((h) => [h.warning, h.at])).toEqual([
      ['sexual-violence', '00:01:10'],
      ['suicide-self-harm', '00:02:00'],
      ['animal-cruelty', '00:03:30'],
    ]);
    expect(hits[0]).toMatchObject({ part: 2, context: expect.stringContaining('accused of rape') });
  });

  it('groups a story by warning, in part order, and skips missing transcripts', () => {
    const story = scanStory(
      new Map([
        [2, transcript],
        [1, '00:00:01\nSpeaker 1: A note on suicide.'],
        [3, null],
      ]),
      rules,
    );
    expect(story.get('suicide-self-harm')?.map((h) => h.part)).toEqual([1, 2]);
    expect(story.get('child-sexual-abuse')).toEqual([]);
  });

  it('lists candidates in the packet, counting the ones past the limit', () => {
    const many = Array.from({ length: 35 }, (_, i) => ({
      warning: 'suicide-self-harm',
      part: 1,
      at: `00:${String(i).padStart(2, '0')}:00`,
      context: 'a suicide',
    }));
    const text = scanSection(new Map([['suicide-self-harm', many]]), rules).join('\n');
    expect(text).toContain('### Suicide & self-harm (`suicide-self-harm`): 35 candidates');
    expect(text).toContain('- (5 more not shown)');
    expect(text).toContain('### Sexual violence (`sexual-violence`): 0 candidates\n\nNo matches.');
  });
});

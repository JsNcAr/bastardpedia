// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import { mergeWarnings, spliceKeys } from './apply-warnings.ts';
import { clusters, spread } from './warnings-packet.ts';

const order = [
  'sexual-violence',
  'child-sexual-abuse',
  'child-abuse',
  'graphic-violence',
  'suicide-self-harm',
];
const strict = new Set([
  'sexual-violence',
  'child-sexual-abuse',
  'child-abuse',
  'suicide-self-harm',
]);
const ev = (facet: string, at: string) => ({ facet, part: 1, at, note: 'n' });

const record = {
  story_id: 's',
  content_warnings: ['graphic-violence', 'child-abuse'],
  keywords: [],
  evidence: [
    ...Array.from({ length: 10 }, (_, i) => ev('time', `00:0${String(i)}:00`)),
    ev('content_warnings', '00:30:00'),
  ],
} as unknown as StoryTags;

describe('mergeWarnings', () => {
  it('replaces strict warnings only, adds mentions after warnings, and makes room for evidence', () => {
    const out = mergeWarnings(
      record,
      {
        story_id: 's',
        detailed: ['child-sexual-abuse'],
        mentions: ['suicide-self-harm', 'child-sexual-abuse'],
        evidence: [
          { facet: 'content_warnings', part: 2, at: '00:40:00', note: 'a' },
          { facet: 'content_mentions', part: 2, at: '00:50:00', note: 'b' },
        ],
      },
      order,
      strict,
    );
    expect(out.content_warnings).toEqual(['child-sexual-abuse', 'graphic-violence']);
    expect(out.content_mentions).toEqual(['suicide-self-harm']);
    expect(Object.keys(out)).toEqual([
      'story_id',
      'content_warnings',
      'content_mentions',
      'keywords',
      'evidence',
    ]);
    expect(out.evidence).toHaveLength(12);
    expect(out.evidence.slice(10).map((e) => e.at)).toEqual(['00:40:00', '00:50:00']);
  });
});

describe('warnings packet helpers', () => {
  it('spreads a long list evenly, keeping both ends', () => {
    expect(spread([1, 2, 3, 4, 5, 6, 7, 8, 9], 3)).toEqual([1, 5, 9]);
    expect(spread([1, 2], 5)).toEqual([1, 2]);
  });

  it('finds runs of candidates less than three minutes apart', () => {
    const h = (part: number, at: string) => ({ warning: 'w', part, at, context: '' });
    expect(
      clusters([
        h(1, '00:10:00'),
        h(1, '00:12:00'),
        h(1, '00:14:30'),
        h(1, '00:30:00'),
        h(2, '00:31:00'),
      ]),
    ).toEqual(['part 1, 00:10 to 00:14 (3 paragraphs)']);
  });
});

describe('spliceKeys', () => {
  it('rewrites only the given keys and adds a missing one after its neighbour', () => {
    const text =
      '{\n  "a": { "x": 1 },\n  "w": ["p", "q"],\n  "n": "say \\"hi\\" [x]",\n  "e": [\n    { "k": 1 }\n  ]\n}\n';
    const out = spliceKeys(text, { w: ['r'], m: ['s'], e: [{ k: 2 }] }, { m: 'w' });
    expect(out).toBe(
      '{\n  "a": { "x": 1 },\n  "w": ["r"],\n  "m": ["s"],\n  "n": "say \\"hi\\" [x]",\n  "e": [{"k":2}]\n}\n',
    );
  });
});

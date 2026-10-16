// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { BLOCK_WORDS, firstWords, sampleWords } from './packet.ts';

describe('firstWords', () => {
  it('cuts after the nth word and keeps formatting', () => {
    expect(firstWords('00:00:05\nSpeaker 1: hello there world', 3)).toEqual({
      excerpt: '00:00:05\nSpeaker 1:',
      truncated: true,
    });
  });
  it('returns short texts whole', () => {
    expect(firstWords('one two', 5)).toEqual({ excerpt: 'one two', truncated: false });
    expect(firstWords('one two', 2)).toEqual({ excerpt: 'one two', truncated: false });
  });
});

describe('sampleWords', () => {
  const para = (i: number) =>
    `00:${String(i).padStart(2, '0')}:00\nSpeaker 1: ${'word '.repeat(299)}end${i}`;
  const text = Array.from({ length: 40 }, (_, i) => para(i)).join('\n\n');

  it('returns the whole transcript when it fits', () => {
    expect(sampleWords('00:00:00\nSpeaker 1: short', 100)).toEqual({
      excerpt: '00:00:00\nSpeaker 1: short',
      sampled: false,
    });
  });

  it('keeps evenly spaced blocks from start to end within the budget', () => {
    const { excerpt, sampled } = sampleWords(text, BLOCK_WORDS * 3);
    expect(sampled).toBe(true);
    expect(excerpt).toContain('end0');
    expect(excerpt).toContain('end39');
    expect(excerpt).toContain('[... part of the transcript skipped ...]');
    expect(excerpt.match(/\S+/g)?.length ?? 0).toBeLessThanOrEqual(BLOCK_WORDS * 3 + 50);
  });
});

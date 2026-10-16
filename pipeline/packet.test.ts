// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { firstWords } from './packet.ts';

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

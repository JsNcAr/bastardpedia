// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { Episode } from '../shared/schemas/episode.ts';
import { groupEpisodes } from './group.ts';

let n = 0;
const ep = (title: string, published: string): Episode => ({
  guid: `g${String(++n)}`,
  title,
  published: `${published}T12:00:00+00:00`,
  duration_s: null,
  description: '',
  link: null,
  audio_url: null,
  transcript_url: null,
  transcript_srt_url: null,
});

describe('groupEpisodes', () => {
  it('chains a retitled part onto the numbered part before it', () => {
    const stories = groupEpisodes([
      ep('Part One: The Butcher of Somewhere', '2019-01-01'),
      ep('Part Two: How He Got Away With It', '2019-01-03'),
    ]);
    expect(stories).toHaveLength(1);
    expect(stories[0]?.parts.map((p) => p.part)).toEqual([1, 2]);
  });

  it('does not attach an orphan Part Two to an unnumbered episode', () => {
    const stories = groupEpisodes([
      ep('Behind the Bastards Presents: Another Show', '2024-12-22'),
      ep('Part Two: How a Folk Singer Fought Fascism', '2024-12-26'),
    ]);
    expect(stories).toHaveLength(2);
  });

  it('attaches CZM Rewind reruns to the original, with or without a colon', () => {
    const stories = groupEpisodes([
      ep('Part One: Curtis Yarvin: The Philosopher', '2024-09-17'),
      ep('Part Two: Curtis Yarvin: The Philosopher', '2024-09-19'),
      ep('CZM Rewind Part One: Curtis Yarvin: The Philosopher', '2026-11-24'),
      ep('CZM Rewind: Part Two: Curtis Yarvin: The Philosopher', '2026-11-26'),
    ]);
    expect(stories).toHaveLength(1);
    expect(stories[0]?.parts).toHaveLength(2);
    expect(stories[0]?.reruns).toHaveLength(2);
  });
});

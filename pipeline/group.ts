/**
 * Group data/episodes.json into multi-part stories and write data/stories.json.
 *
 * Each story gets a `kind`; only kind === 'episode' stories are tagged and shipped.
 * Reruns ("CZM Rewind") attach to the original story when the subject matches.
 */
import { writeFileSync } from 'node:fs';
import { z } from 'zod';
import { StorySchema, type Episode, type Story } from '../shared/schemas/episode.ts';
import { loadEpisodes, toJson } from './lib/io.ts';
import { STORIES_FILE } from './lib/paths.ts';

type Kind = Story['kind'];
type PartRef = Story['parts'][number];

const NUM = '(?:One|Two|Three|Four|Five|Six|Seven|Eight|Nine|Ten|\\d+)';
// [\p{L}\p{N}_] is Python's Unicode-aware \w.
const PART_PREFIX = new RegExp(
  `^(?:[\\p{L}\\p{N}_-]+\\s+)?Part\\s*:?\\s*${NUM}\\s*[:.\\-]?\\s*`,
  'iu',
);
const PART_SUFFIX = new RegExp(
  `\\s*(?:[,:\\-]\\s*|\\()\\s*Parts?\\s+${NUM}(?:\\s*(?:&|-|and)\\s*${NUM})?\\)?\\s*$`,
  'iu',
);
const PART_NUMBER = new RegExp(`\\bParts?\\s*:?\\s*(${NUM})\\b`, 'i');
const WORDS = Object.fromEntries(
  'one two three four five six seven eight nine ten'.split(' ').map((w, i) => [w, i + 1]),
) as Record<string, number>;

const KIND_RULES: [Kind, RegExp][] = [
  ['ichh_weekly', /^It Could Happen Here Weekly/i],
  ['trailer', /\bTrailer\b/i],
  ['rerun', /^CZM Rewind\s*:\s*/i],
  ['fiction', /^(After the Revolution\s*:)?\s*Chapters?\b/i],
  ['other_show', /^Episode \d+: Uprising/i],
];

/** Series parts more than this many days apart are not chained by sequence. */
const MAX_PART_GAP_DAYS = 45;

export function kindOf(title: string): Kind {
  for (const [kind, pattern] of KIND_RULES) if (pattern.test(title)) return kind;
  return 'episode';
}

export function partNumber(title: string): number {
  const token = PART_NUMBER.exec(title)?.[1]?.toLowerCase();
  if (!token) return 1;
  return /^\d+$/.test(token) ? Number(token) : (WORDS[token] ?? 1);
}

/** Python's str.strip(chars). */
function stripChars(text: string, chars: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && chars.includes(text.charAt(start))) start++;
  while (end > start && chars.includes(text.charAt(end - 1))) end--;
  return text.slice(start, end);
}

export function subjectOf(title: string): string {
  let t = title.trim().replace(/^CZM Rewind\s*:\s*/i, '');
  t = t.replace(PART_PREFIX, '');
  t = t.replace(PART_SUFFIX, '');
  return stripChars(t, ' :-');
}

export function slug(text: string): string {
  const ascii = text.normalize('NFKD').replace(/[\u0080-\u{10FFFF}]/gu, '');
  return stripChars(ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-'), '-');
}

function daysBetween(a: string, b: string): number {
  return Math.abs(Date.parse(b) - Date.parse(a)) / 86_400_000;
}

export function groupEpisodes(episodes: Episode[]): Story[] {
  const stories = new Map<string, Story>();
  const openSeries: Story[] = []; // stories still accepting a next part, newest last

  for (const ep of episodes) {
    // chronological, so the first airing creates the story
    const kind = kindOf(ep.title);
    const subject = subjectOf(ep.title);
    const part = partNumber(ep.title);
    const isRerun = kind === 'rerun';
    let key = `${isRerun ? 'episode' : kind}:${slug(subject)}`;

    if (isRerun && !stories.has(key)) {
      key = `rerun:${slug(subject)}`; // original not found under the same title
    } else if (kind === 'episode' && part > 1 && !stories.has(key)) {
      // Early series often retitle every part: attach to the newest open series
      // whose last part is part - 1, published within MAX_PART_GAP_DAYS.
      for (const cand of [...openSeries].reverse()) {
        const last = cand.parts.at(-1);
        if (
          last?.part === part - 1 &&
          daysBetween(last.published, ep.published) <= MAX_PART_GAP_DAYS
        ) {
          key = `episode:${cand.id}`;
          break;
        }
      }
    }

    let story = stories.get(key);
    if (!story) {
      const sep = key.indexOf(':');
      story = {
        id: key.slice(sep + 1),
        kind: key.startsWith('rerun:') ? 'rerun' : kind,
        subject_title: subject,
        first_published: ep.published,
        parts: [],
        reruns: [],
      };
      stories.set(key, story);
    }
    const entry: PartRef = { guid: ep.guid, title: ep.title, part, published: ep.published };
    if (isRerun && story.kind === 'episode') {
      story.reruns.push(entry);
      continue;
    }
    story.parts.push(entry);
    if (story.kind === 'episode') {
      const at = openSeries.indexOf(story);
      if (at >= 0) openSeries.splice(at, 1);
      openSeries.push(story);
    }
  }

  for (const s of stories.values()) {
    s.parts.sort(
      (a, b) =>
        a.part - b.part || (a.published < b.published ? -1 : a.published > b.published ? 1 : 0),
    );
  }
  return z.array(StorySchema).parse([...stories.values()]);
}

function main(): void {
  const stories = groupEpisodes(loadEpisodes());
  writeFileSync(STORIES_FILE, toJson(stories));

  const counts = new Map<string, number>();
  for (const s of stories) counts.set(s.kind, (counts.get(s.kind) ?? 0) + 1);
  console.log(`${stories.length} stories -> ${STORIES_FILE}`);
  for (const [k, v] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
}

if (import.meta.main) main();

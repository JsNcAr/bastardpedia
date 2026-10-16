/**
 * Build the tagging packet for one story: everything a tagging agent needs, in one file.
 *
 *   node pipeline/packet.ts <story-id>     # writes data/packets/<story-id>.md and prints the path
 *
 * Contents: ids and versions, every part's title and description, the transcripts, and
 * the full taxonomy YAML. Missing transcripts are downloaded first.
 *
 * Transcripts go in whole while the story fits in PACKET_WORDS. A longer story gets an
 * equal share per part, filled with evenly spaced blocks of about BLOCK_WORDS words from
 * the start to the end of each part, so the tagger sees every period the story covers
 * (the first blind test showed that cutting later parts short made taggers guess).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAXONOMY_FILES } from '../shared/taxonomy.ts';
import { loadEpisodes, loadStories } from './lib/io.ts';
import { PACKETS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { ensureTranscript, readTranscript } from './lib/transcripts.ts';

export const PACKET_WORDS = 60_000;
export const BLOCK_WORDS = 600;

const wordCount = (text: string) => text.match(/\S+/g)?.length ?? 0;

/** The first `n` words of a transcript, keeping its line breaks and timestamps. */
export function firstWords(text: string, n: number): { excerpt: string; truncated: boolean } {
  const re = /\S+/g;
  let count = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    count++;
    if (count === n)
      return { excerpt: text.slice(0, m.index + m[0].length), truncated: re.exec(text) !== null };
  }
  return { excerpt: text, truncated: false };
}

/**
 * At most about `n` words of a transcript: all of it if it fits, otherwise evenly spaced
 * blocks of consecutive paragraphs (each starting with its timestamp), first block included.
 */
export function sampleWords(text: string, n: number): { excerpt: string; sampled: boolean } {
  if (wordCount(text) <= n) return { excerpt: text.trim(), sampled: false };
  const paragraphs = text.trim().split(/\n{2,}/);
  const blocks: string[][] = [];
  let current: string[] = [];
  let words = 0;
  for (const p of paragraphs) {
    current.push(p);
    words += wordCount(p);
    if (words >= BLOCK_WORDS) {
      blocks.push(current);
      current = [];
      words = 0;
    }
  }
  if (current.length) blocks.push(current);
  const keep = Math.max(1, Math.floor(n / BLOCK_WORDS));
  const picked = new Set<number>();
  for (let i = 0; i < keep; i++)
    picked.add(Math.round((i * (blocks.length - 1)) / Math.max(1, keep - 1)));
  const out: string[] = [];
  let last = -1;
  for (const i of [...picked].sort((a, b) => a - b)) {
    if (last >= 0 && i > last + 1) out.push('[... part of the transcript skipped ...]');
    out.push((blocks[i] ?? []).join('\n\n'));
    last = i;
  }
  return { excerpt: out.join('\n\n'), sampled: true };
}

async function main(): Promise<void> {
  const id = process.argv[2];
  if (!id) throw new Error('usage: node pipeline/packet.ts <story-id>');
  const story = loadStories().find((s) => s.id === id && s.kind === 'episode');
  if (!story) throw new Error(`no BtB story with id "${id}" in data/stories.json`);
  const episodes = new Map(loadEpisodes().map((e) => [e.guid, e]));
  const taxonomy = loadTaxonomy();

  const out: string[] = [
    `# Tagging packet: ${story.subject_title}`,
    '',
    'Follow tagging/PROMPT.md. Return one JSON object only.',
    '',
    `- story_id: \`${story.id}\``,
    `- taxonomy_version: \`${taxonomy.version}\``,
    `- parts: ${story.parts.length}`,
    `- first published: ${story.first_published.slice(0, 10)}`,
    '',
    '## Parts and descriptions',
    '',
  ];
  for (const part of story.parts) {
    const ep = episodes.get(part.guid);
    out.push(
      `### Part ${part.part}: ${part.title}`,
      '',
      `Published ${part.published.slice(0, 10)}.`,
      '',
      ep?.description ?? '(no description)',
      '',
    );
  }

  const texts = new Map<number, string | null>();
  for (const part of story.parts) {
    const ep = episodes.get(part.guid);
    if (ep) await ensureTranscript(ep);
    texts.set(part.part, readTranscript(part.guid));
  }
  const total = [...texts.values()].reduce((sum, t) => sum + (t ? wordCount(t) : 0), 0);
  const perPart = total <= PACKET_WORDS ? Infinity : Math.floor(PACKET_WORDS / story.parts.length);

  out.push(
    '## Transcripts',
    '',
    'Speakers are labelled generically. Timestamps are HH:MM:SS from the start of each part.',
    total <= PACKET_WORDS
      ? 'Every transcript is complete.'
      : `The story is long (${total.toLocaleString('en')} words), so each part is shown as evenly spaced blocks from start to end; gaps are marked.`,
    '',
  );
  for (const part of story.parts) {
    const text = texts.get(part.part);
    if (!text) {
      out.push(`### Part ${part.part}`, '', '(no transcript available for this part)', '');
      continue;
    }
    const { excerpt, sampled } = sampleWords(text, perPart);
    out.push(
      `### Part ${part.part} (${sampled ? 'sampled' : 'complete'}, ${wordCount(text).toLocaleString('en')} words in full)`,
      '',
      '```text',
      excerpt,
      '[end of part]',
      '```',
      '',
    );
  }

  out.push('## Taxonomy', '', `Version ${taxonomy.version}. Use only ids that appear below.`, '');
  for (const file of TAXONOMY_FILES)
    out.push(`### ${file}`, '', '```yaml', taxonomy.sources[file].trim(), '```', '');

  mkdirSync(PACKETS_DIR, { recursive: true });
  const path = join(PACKETS_DIR, `${story.id}.md`);
  writeFileSync(path, out.join('\n'));
  console.log(path);
}

if (import.meta.main) await main();

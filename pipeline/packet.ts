/**
 * Build the tagging packet for one story: everything a tagging agent needs, in one file.
 *
 *   node pipeline/packet.ts <story-id>     # writes data/packets/<story-id>.md and prints the path
 *
 * Contents: ids and versions, every part's title and description, transcript excerpts
 * (the first PART_ONE_WORDS words of part 1, the first LATER_PART_WORDS of each later
 * part), and the full taxonomy YAML. Missing transcripts are downloaded first.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAXONOMY_FILES } from '../shared/taxonomy.ts';
import { loadEpisodes, loadStories } from './lib/io.ts';
import { PACKETS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { ensureTranscript, readTranscript } from './lib/transcripts.ts';

export const PART_ONE_WORDS = 15_000;
export const LATER_PART_WORDS = 2_000;

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

  out.push(
    '## Transcript excerpts',
    '',
    'Speakers are labelled generically. Timestamps are HH:MM:SS from the start of each part.',
    '',
  );
  for (const part of story.parts) {
    const ep = episodes.get(part.guid);
    if (ep) await ensureTranscript(ep);
    const text = readTranscript(part.guid);
    const limit = part.part === 1 ? PART_ONE_WORDS : LATER_PART_WORDS;
    out.push(`### Part ${part.part} (first ${limit.toLocaleString('en')} words)`, '');
    if (!text) {
      out.push('(no transcript available for this part)', '');
      continue;
    }
    const { excerpt, truncated } = firstWords(text, limit);
    out.push(
      '```text',
      excerpt.trim(),
      truncated ? '[... transcript continues ...]' : '[end of transcript]',
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

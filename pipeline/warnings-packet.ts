/**
 * Build the warnings re-check packet for one or more stories: what a re-check agent needs to
 * decide the strict content warnings (tagging/WARNINGS.md), without the whole transcript.
 *
 *   node pipeline/warnings-packet.ts <story-id> ...   # writes data/packets/warnings/<id>.md
 *
 * Contents: the story's parts and descriptions, its current summary, themes and warnings, the
 * strict warnings' definitions, and every scan candidate with a wide context window. Packets
 * hold transcript excerpts, so they stay in data/packets/ (git-ignored, ADR 0007).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deepMerge } from './lib/merge.ts';
import { loadEpisodes, loadStories, readJson } from './lib/io.ts';
import { OVERRIDES_DIR, PACKETS_DIR, TAGS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { readTranscript } from './lib/transcripts.ts';
import { scanRules, scanStory, type ScanHit } from './lib/warning-scan.ts';

export const WARNINGS_PACKETS_DIR = join(PACKETS_DIR, 'warnings');
/** Characters either side of a match: enough to tell a joke from an account. */
export const WIDE_CONTEXT = 260;
/** Candidates shown per warning, evenly spaced through the story; the rest are counted. */
export const SHOWN = 40;

interface Current {
  summary: string;
  themes: { primary: string; secondary: string[] };
  content_warnings: string[];
  content_mentions?: string[];
}

/** At most `n` items, evenly spaced, first and last included. */
export function spread<T>(items: readonly T[], n: number): T[] {
  if (items.length <= n) return [...items];
  const picked = new Set<number>();
  for (let i = 0; i < n; i++) picked.add(Math.round((i * (items.length - 1)) / (n - 1)));
  return [...picked].sort((a, b) => a - b).map((i) => items[i] as T);
}

const seconds = (at: string) => {
  const [h = 0, m = 0, s = 0] = at.split(':').map(Number);
  return h * 3600 + m * 60 + s;
};

/** Runs of candidates less than three minutes apart in the same part, as "part 1, 00:10-00:16". */
export function clusters(hits: readonly ScanHit[]): string[] {
  const out: { part: number; from: string; to: string; n: number }[] = [];
  for (const h of hits) {
    const last = out.at(-1);
    if (last?.part === h.part && seconds(h.at) - seconds(last.to) < 180) {
      last.to = h.at;
      last.n++;
    } else out.push({ part: h.part, from: h.at, to: h.at, n: 1 });
  }
  return out
    .filter((c) => c.n > 1)
    .map(
      (c) =>
        `part ${String(c.part)}, ${c.from.slice(0, 5)} to ${c.to.slice(0, 5)} (${String(c.n)} paragraphs)`,
    );
}

function build(id: string): string {
  const story = loadStories().find((s) => s.id === id && s.kind === 'episode');
  if (!story) throw new Error(`no BtB story with id "${id}"`);
  const tagFile = join(TAGS_DIR, `${id}.json`);
  if (!existsSync(tagFile)) throw new Error(`"${id}" has no tag record`);
  const overrideFile = join(OVERRIDES_DIR, `${id}.json`);
  const raw = readJson(tagFile);
  const tags = (existsSync(overrideFile) ? deepMerge(raw, readJson(overrideFile)) : raw) as Current;
  const episodes = new Map(loadEpisodes().map((e) => [e.guid, e]));
  const taxonomy = loadTaxonomy();
  const rules = scanRules(taxonomy);
  const hits = scanStory(
    new Map(story.parts.map((p) => [p.part, readTranscript(p.guid)])),
    rules,
    WIDE_CONTEXT,
  );

  const out: string[] = [
    `# Warnings re-check packet: ${story.subject_title}`,
    '',
    'Follow tagging/WARNINGS.md.',
    '',
    `- story_id: \`${id}\``,
    `- taxonomy_version: \`${taxonomy.version}\``,
    `- parts: ${String(story.parts.length)}`,
    '',
    '## Parts and descriptions',
    '',
  ];
  for (const p of story.parts) {
    const ep = episodes.get(p.guid);
    const missing = readTranscript(p.guid) === null ? ' (no transcript: not scanned)' : '';
    out.push(`### Part ${String(p.part)}: ${p.title}${missing}`, '', ep?.description ?? '', '');
  }
  out.push(
    '## Current tags',
    '',
    `- summary: ${tags.summary}`,
    `- themes: ${[tags.themes.primary, ...tags.themes.secondary].join(', ')}`,
    `- content_warnings: ${tags.content_warnings.join(', ') || '(none)'}`,
    `- content_mentions: ${tags.content_mentions ? tags.content_mentions.join(', ') || '(none)' : '(never checked)'}`,
    '',
    '## Strict warnings',
    '',
  );
  for (const w of taxonomy.contentWarnings.filter((x) => x.strict))
    out.push(`- \`${w.id}\` (${w.label}): ${w.definition.replace(/\s+/g, ' ').trim()}`);
  out.push('', '## Candidates (automatic word scan of the full transcripts)', '');
  for (const rule of rules) {
    const list = hits.get(rule.id) ?? [];
    out.push(`### ${rule.label} (\`${rule.id}\`): ${String(list.length)} candidates`, '');
    if (list.length === 0) {
      out.push('No matches.', '');
      continue;
    }
    const runs = clusters(list);
    if (runs.length) out.push(`Runs of nearby candidates: ${runs.join('; ')}.`, '');
    for (const h of spread(list, SHOWN))
      out.push(`- Part ${String(h.part)}, ${h.at}: ${h.context}`);
    if (list.length > SHOWN)
      out.push(`- (${String(list.length - SHOWN)} more, spread between those shown)`);
    out.push('');
  }
  mkdirSync(WARNINGS_PACKETS_DIR, { recursive: true });
  const path = join(WARNINGS_PACKETS_DIR, `${id}.md`);
  writeFileSync(path, out.join('\n'));
  return path;
}

function main(): void {
  const ids = process.argv.slice(2);
  if (ids.length === 0) throw new Error('usage: node pipeline/warnings-packet.ts <story-id> ...');
  for (const id of ids) console.log(build(id));
}

if (import.meta.main) main();

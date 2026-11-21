/**
 * Merge warnings re-check results (tagging/WARNINGS.md) into the tag records.
 *
 *   node pipeline/apply-warnings.ts --report tagging/batches/warnings-01-report.json <id> ...
 *
 * Reads data/review/warnings/<id>.json, replaces the record's strict content warnings with the
 * result's `detailed` list (other warnings stay), sets `content_mentions`, and adds the result's
 * evidence (older warning evidence makes room first). Every record is validated before it is
 * written. The report lists each story's warnings before and after, with the agent's notes; it
 * holds no transcript text.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import { LIMITS } from '../shared/schemas/story-tags.ts';
import { WarningsRecheckSchema, type WarningsRecheck } from '../shared/schemas/warnings-recheck.ts';
import { loadStories, readJson, toJson } from './lib/io.ts';
import { DATA_DIR, TAGS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { makeValidator, releaseYearsOf } from './lib/validate.ts';

export const RESULTS_DIR = join(DATA_DIR, 'review', 'warnings');

type Evidence = StoryTags['evidence'][number];

export interface ReportRow {
  id: string;
  before: { warnings: string[]; mentions: string[] | null };
  after: { warnings: string[]; mentions: string[] };
  notes?: string;
}

/** The record with the result merged in, warnings in taxonomy order. Pure, for tests. */
export function mergeWarnings(
  record: StoryTags,
  result: WarningsRecheck,
  order: readonly string[],
  strict: ReadonlySet<string>,
): StoryTags {
  const byOrder = (ids: Iterable<string>) =>
    [...new Set(ids)].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const warnings = byOrder([
    ...record.content_warnings.filter((w) => !strict.has(w)),
    ...result.detailed,
  ]);
  const mentions = byOrder(result.mentions.filter((m) => !warnings.includes(m)));

  const isWarning = (e: Evidence) =>
    e.facet === 'content_warnings' || e.facet === 'content_mentions';
  const others = record.evidence.filter((e) => !isWarning(e));
  const older = record.evidence.filter(isWarning);
  const room = Math.max(0, LIMITS.evidence - others.length);
  const added = result.evidence.slice(0, room);
  const evidence = [...others, ...added, ...older.slice(0, room - added.length)];

  // Keep the key order of the record, with content_mentions right after content_warnings.
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === 'content_mentions') continue;
    out[key] = key === 'content_warnings' ? warnings : key === 'evidence' ? evidence : value;
    if (key === 'content_warnings') out.content_mentions = mentions;
  }
  return out as StoryTags;
}

/** End index (exclusive) of the JSON value starting at `start`, skipping over strings. */
function valueEnd(text: string, start: number): number {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      for (i++; i < text.length && text[i] !== '"'; i++) if (text[i] === '\\') i++;
      if (depth === 0) return i + 1;
    } else if (c === '[' || c === '{') depth++;
    else if (c === ']' || c === '}') {
      depth--;
      if (depth === 0) return i + 1;
    } else if (depth === 0 && (c === ',' || c === '\n')) return i;
  }
  return text.length;
}

/**
 * The record's file text with only the given top-level keys rewritten (added after `after` when
 * missing), so a re-check diff shows what changed and nothing else.
 */
export function spliceKeys(
  text: string,
  values: Record<string, unknown>,
  after: Record<string, string>,
): string {
  let out = text;
  for (const [key, value] of Object.entries(values)) {
    const json = JSON.stringify(value);
    const marker = `\n  "${key}": `;
    const at = out.indexOf(marker);
    if (at >= 0) {
      const start = at + marker.length;
      out = out.slice(0, start) + json + out.slice(valueEnd(out, start));
      continue;
    }
    const prev = `\n  "${after[key] ?? ''}": `;
    const p = out.indexOf(prev);
    if (p < 0) throw new Error(`no "${after[key] ?? ''}" key to add "${key}" after`);
    const end = valueEnd(out, p + prev.length);
    out = `${out.slice(0, end)},\n  "${key}": ${json}${out.slice(end)}`;
  }
  return out;
}

async function formatted(text: string, path: string): Promise<string> {
  const options = (await resolveConfig(path)) ?? {};
  return format(text, { ...options, parser: 'json' });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const r = args.indexOf('--report');
  const reportPath = r >= 0 ? args[r + 1] : undefined;
  const ids = args.filter((_, i) => i !== r && i !== r + 1);
  if (!reportPath || ids.length === 0)
    throw new Error('usage: node pipeline/apply-warnings.ts --report <file> <story-id> ...');

  const taxonomy = loadTaxonomy();
  const order = taxonomy.contentWarnings.map((w) => w.id);
  const strict = new Set(taxonomy.contentWarnings.filter((w) => w.strict).map((w) => w.id));
  const stories = loadStories().filter((s) => s.kind === 'episode');
  const validate = makeValidator({
    taxonomy,
    episodeStoryIds: new Set(stories.map((s) => s.id)),
    releaseYears: releaseYearsOf(stories),
  });

  const rows: ReportRow[] = existsSync(reportPath)
    ? (JSON.parse(readFileSync(reportPath, 'utf8')) as ReportRow[])
    : [];
  const failed: string[] = [];
  for (const id of ids) {
    const resultFile = join(RESULTS_DIR, `${id}.json`);
    if (!existsSync(resultFile)) {
      failed.push(`${id}: no result in ${resultFile}`);
      continue;
    }
    const parsed = WarningsRecheckSchema.safeParse(readJson(resultFile));
    if (!parsed.success || parsed.data.story_id !== id) {
      failed.push(`${id}: result is malformed or names another story`);
      continue;
    }
    const outside = [...parsed.data.detailed, ...parsed.data.mentions].filter(
      (w) => !strict.has(w),
    );
    if (outside.length) {
      failed.push(`${id}: not strict warnings: ${outside.join(', ')}`);
      continue;
    }
    const tagFile = join(TAGS_DIR, `${id}.json`);
    const record = readJson(tagFile) as StoryTags;
    const merged = mergeWarnings(record, parsed.data, order, strict);
    const { errors } = validate(merged, id);
    if (errors.length) {
      failed.push(`${id}: ${errors.join('; ')}`);
      continue;
    }
    const text = spliceKeys(
      readFileSync(tagFile, 'utf8'),
      {
        content_warnings: merged.content_warnings,
        content_mentions: merged.content_mentions,
        evidence: merged.evidence,
      },
      { content_mentions: 'content_warnings' },
    );
    writeFileSync(tagFile, await formatted(text, tagFile));
    const row: ReportRow = {
      id,
      before: { warnings: record.content_warnings, mentions: record.content_mentions ?? null },
      after: { warnings: merged.content_warnings, mentions: merged.content_mentions ?? [] },
      ...(parsed.data.notes ? { notes: parsed.data.notes } : {}),
    };
    const at = rows.findIndex((x) => x.id === id);
    if (at >= 0) rows[at] = { ...row, before: rows[at]?.before ?? row.before };
    else rows.push(row);
  }
  writeFileSync(reportPath, await formatted(toJson(rows), reportPath));
  console.log(
    `apply-warnings: ${String(ids.length - failed.length)} of ${String(ids.length)} applied -> ${reportPath}`,
  );
  for (const f of failed) console.error(`  ${f}`);
  if (failed.length) process.exitCode = 1;
}

if (import.meta.main) await main();

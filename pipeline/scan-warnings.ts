/**
 * Scan every tagged story's transcripts for strict content warnings and compare with its tags.
 *
 *   node pipeline/scan-warnings.ts            # all tagged BtB stories
 *   node pipeline/scan-warnings.ts <id> ...   # only these
 *
 * Writes data/review/warning-scan.json (git-ignored) with counts and timestamps only, never
 * transcript text, and prints how many stories have candidates their tags don't cover. Use it to
 * pick the stories whose warnings need re-checking; the tagger confirms each candidate from the
 * packet (npm run tags:packet).
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { deepMerge } from './lib/merge.ts';
import { loadStories, readJson, toJson } from './lib/io.ts';
import { DATA_DIR, OVERRIDES_DIR, TAGS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { readTranscript } from './lib/transcripts.ts';
import { scanRules, scanStory } from './lib/warning-scan.ts';

export const SCAN_REPORT = join(DATA_DIR, 'review', 'warning-scan.json');

interface Tagged {
  content_warnings: string[];
  content_mentions?: string[];
}

export interface ScanRow {
  id: string;
  /** False while the record predates content_mentions (never checked for brief mentions). */
  mentions_checked: boolean;
  /** Per strict warning: candidate count, and the first few timestamps as "part@HH:MM:SS". */
  candidates: Record<string, { count: number; first: string[] }>;
  /** Strict warnings with candidates that the record has at neither level. */
  uncovered: string[];
}

function main(): void {
  const taxonomy = loadTaxonomy();
  const rules = scanRules(taxonomy);
  const wanted = new Set(process.argv.slice(2));
  const stories = loadStories().filter(
    (s) =>
      s.kind === 'episode' &&
      (wanted.size === 0 || wanted.has(s.id)) &&
      existsSync(join(TAGS_DIR, `${s.id}.json`)),
  );

  const rows: ScanRow[] = [];
  for (const story of stories) {
    const overrideFile = join(OVERRIDES_DIR, `${story.id}.json`);
    const raw = readJson(join(TAGS_DIR, `${story.id}.json`));
    const tags = (
      existsSync(overrideFile) ? deepMerge(raw, readJson(overrideFile)) : raw
    ) as Tagged;
    const texts = new Map(story.parts.map((p) => [p.part, readTranscript(p.guid)]));
    const hits = scanStory(texts, rules);
    const covered = new Set([...tags.content_warnings, ...(tags.content_mentions ?? [])]);
    const candidates: ScanRow['candidates'] = {};
    for (const [warning, list] of hits) {
      if (list.length === 0) continue;
      candidates[warning] = {
        count: list.length,
        first: list.slice(0, 5).map((h) => `${String(h.part)}@${h.at}`),
      };
    }
    rows.push({
      id: story.id,
      mentions_checked: tags.content_mentions !== undefined,
      candidates,
      uncovered: Object.keys(candidates).filter((w) => !covered.has(w)),
    });
  }

  mkdirSync(dirname(SCAN_REPORT), { recursive: true });
  writeFileSync(SCAN_REPORT, toJson({ taxonomy_version: taxonomy.version, stories: rows }));

  console.log(`scan: ${String(rows.length)} stories -> ${SCAN_REPORT}`);
  for (const rule of rules) {
    const withHits = rows.filter((r) => r.candidates[rule.id]);
    const uncovered = rows.filter((r) => r.uncovered.includes(rule.id));
    console.log(
      `  ${rule.id}: ${String(withHits.length)} with candidates, ${String(uncovered.length)} not in the tags`,
    );
  }
  const unchecked = rows.filter((r) => !r.mentions_checked).length;
  console.log(`  never checked for brief mentions: ${String(unchecked)}`);
}

if (import.meta.main) main();

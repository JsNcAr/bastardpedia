/**
 * Score tagger output against gold records (calibration, docs/TAGGING.md).
 *
 *   node pipeline/score-tags.ts --dir data/blind-test --gold tagging/examples \
 *     [--gold tagging/examples/unreviewed] [--flags data/review/blind-flags.json]
 *
 * Key fields are pass/fail: format, main theme, first role, first setting country, and
 * covered years within +-5 years. A main-theme swap counts as a match (each side's main
 * theme is among the other's themes): the app's theme filter treats main and other themes
 * alike. Main years and the overlap of other themes, roles, settings and content warnings
 * are reported for reading, not scored; main years no longer drive any filter. The bar:
 * every format right, and each other key field right in all but at most one story of
 * the first --gold folder (the approved set). Exits 1 when the bar is missed.
 */
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import type { StoryTags } from '../shared/schemas/story-tags.ts';
import { readJson } from './lib/io.ts';
import { DATA_DIR } from './lib/paths.ts';

export const YEAR_TOLERANCE = 5;

export const KEY_FIELDS = [
  'format',
  'theme_primary',
  'role_first',
  'setting_first',
  'covered_years',
] as const;
export type KeyField = (typeof KEY_FIELDS)[number] | 'main_years';
const REPORTED_FIELDS: readonly KeyField[] = [...KEY_FIELDS, 'main_years'];

export interface StoryScore {
  id: string;
  key: Record<KeyField, { ok: boolean; got: string; gold: string }>;
  overlap: Record<'theme_secondary' | 'roles' | 'setting' | 'content_warnings', number>;
}

const yearsClose = (a: number | null, b: number | null) =>
  a === null || b === null ? a === b : Math.abs(a - b) <= YEAR_TOLERANCE;

const spanText = (s: { start: number; end: number | null } | undefined) =>
  s ? `${s.start}-${s.end ?? 'ongoing'}` : 'none';

function jaccard(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size && !B.size) return 1;
  const inter = [...A].filter((x) => B.has(x)).length;
  return inter / new Set([...A, ...B]).size;
}

export function scoreStory(got: StoryTags, gold: StoryTags): StoryScore {
  const span = (t: StoryTags, k: 'main_span' | 'covered_span') => t.time?.[k];
  const spanOk = (k: 'main_span' | 'covered_span') => {
    const g = span(got, k);
    const r = span(gold, k);
    if (!g || !r) return g === r;
    return yearsClose(g.start, r.start) && yearsClose(g.end, r.end);
  };
  const field = (ok: boolean, g: string, r: string) => ({ ok, got: g, gold: r });
  return {
    id: gold.story_id,
    key: {
      format: field(got.format === gold.format, got.format, gold.format),
      theme_primary: field(
        got.themes.primary === gold.themes.primary ||
          (gold.themes.secondary.includes(got.themes.primary) &&
            got.themes.secondary.includes(gold.themes.primary)),
        got.themes.primary,
        gold.themes.primary,
      ),
      role_first: field(
        (got.roles[0] ?? '') === (gold.roles[0] ?? ''),
        got.roles[0] ?? 'none',
        gold.roles[0] ?? 'none',
      ),
      setting_first: field(
        (got.regions.setting[0] ?? '') === (gold.regions.setting[0] ?? ''),
        got.regions.setting[0] ?? 'none',
        gold.regions.setting[0] ?? 'none',
      ),
      covered_years: field(
        spanOk('covered_span'),
        spanText(span(got, 'covered_span')),
        spanText(span(gold, 'covered_span')),
      ),
      main_years: field(
        spanOk('main_span'),
        spanText(span(got, 'main_span')),
        spanText(span(gold, 'main_span')),
      ),
    },
    overlap: {
      theme_secondary: jaccard(got.themes.secondary, gold.themes.secondary),
      roles: jaccard(got.roles, gold.roles),
      setting: jaccard(got.regions.setting, gold.regions.setting),
      content_warnings: jaccard(got.content_warnings, gold.content_warnings),
    },
  };
}

const LABELS: Record<KeyField, string> = {
  format: 'Format',
  theme_primary: 'Main theme',
  role_first: 'First role',
  setting_first: 'First setting',
  covered_years: 'Covered years',
  main_years: 'Main years',
};

function argsOf(name: string): string[] {
  const out: string[] = [];
  process.argv.forEach((a, i) => {
    const next = process.argv[i + 1];
    if (a === `--${name}` && next) out.push(next);
  });
  return out;
}

function main(): void {
  const dirArg = argsOf('dir')[0];
  const goldDirs = argsOf('gold').map((d) => resolve(d));
  if (!dirArg || !goldDirs.length)
    throw new Error('usage: score-tags.ts --dir <tagger output> --gold <dir> [--gold <dir>]');
  const dir = resolve(dirArg);

  const groups = goldDirs.map((g) => ({ dir: g, scores: [] as StoryScore[] }));
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    const group = groups.find((g) => existsSync(join(g.dir, file)));
    if (!group) continue;
    group.scores.push(
      scoreStory(
        readJson(join(dir, file)) as StoryTags,
        readJson(join(group.dir, file)) as StoryTags,
      ),
    );
  }

  const lines: string[] = ['# Blind test score', ''];
  let pass = true;
  const flags: Record<string, string[]> = {};
  for (const [gi, g] of groups.entries()) {
    const n = g.scores.length;
    lines.push(
      `## ${gi === 0 ? 'Approved gold' : 'Unreviewed drafts'} (${basename(g.dir)}, ${n} stories)`,
      '',
    );
    lines.push(`| Field | Matches | Bar |`, '|---|---|---|');
    for (const k of REPORTED_FIELDS) {
      const ok = g.scores.filter((s) => s.key[k].ok).length;
      const scored = gi === 0 && k !== 'main_years';
      const bar = k === 'format' ? n : n - 1;
      const met = ok >= bar;
      if (scored && !met) pass = false;
      lines.push(
        `| ${LABELS[k]} | ${ok}/${n} | ${scored ? `${bar}/${n} ${met ? 'met' : 'MISSED'}` : 'for information'} |`,
      );
    }
    const avg = (k: keyof StoryScore['overlap']) =>
      n ? (g.scores.reduce((sum, s) => sum + s.overlap[k], 0) / n).toFixed(2) : '-';
    lines.push(
      '',
      `Average overlap (Jaccard, 1 = identical): other themes ${avg('theme_secondary')}, roles ${avg('roles')}, settings ${avg('setting')}, content warnings ${avg('content_warnings')}.`,
      '',
    );
    for (const s of g.scores) {
      const misses = REPORTED_FIELDS.filter((k) => !s.key[k].ok);
      lines.push(
        `- **${s.id}**: ${misses.length ? misses.map((k) => `${LABELS[k]} ${s.key[k].got} (gold ${s.key[k].gold})`).join('; ') : 'all key fields match'}`,
      );
      flags[s.id] = [
        misses.length
          ? `Blind test: ${misses.length} key field(s) differ from the gold record: ${misses.map((k) => `${LABELS[k]} (tagger ${s.key[k].got}, gold ${s.key[k].gold})`).join('; ')}.`
          : 'Blind test: every key field matches the gold record.',
        `Overlap with gold: other themes ${s.overlap.theme_secondary.toFixed(2)}, roles ${s.overlap.roles.toFixed(2)}, settings ${s.overlap.setting.toFixed(2)}, content warnings ${s.overlap.content_warnings.toFixed(2)} (1 = identical).`,
        ...(gi > 0 ? ['The gold record for this story has not been reviewed yet.'] : []),
      ];
    }
    lines.push('');
  }
  lines.push(`**Result: ${pass ? 'bar met' : 'bar missed'}.**`, '');

  const out = join(DATA_DIR, 'review', 'blind-score.md');
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, lines.join('\n'));
  const flagsOut = argsOf('flags')[0];
  if (flagsOut) writeFileSync(resolve(flagsOut), `${JSON.stringify(flags, null, 2)}\n`);
  console.log(lines.join('\n'));
  if (!pass) process.exitCode = 1;
}

if (import.meta.main) main();

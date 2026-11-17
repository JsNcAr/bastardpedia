/**
 * Word scan for strict content warnings (`strict: true` in content-warnings.yaml).
 *
 * A tagger reading hours of transcript misses passing mentions, and a long story's packet only
 * shows samples of it. The scan reads every transcript in full and lists each paragraph that
 * matches a warning's `scan` patterns, with its timestamp and a short context. A hit is only a
 * candidate: the tagger checks it (ad reads and false matches are dropped).
 *
 * Context text comes from the transcript, so it may only go into packets (git-ignored), never
 * into tag records, reports in the repo or the catalogue (ADR 0007).
 */
import type { Taxonomy } from '../../shared/taxonomy.ts';

export interface ScanRule {
  id: string;
  label: string;
  pattern: RegExp;
}

export interface ScanHit {
  warning: string;
  part: number;
  /** HH:MM:SS of the paragraph that matched. */
  at: string;
  /** About CONTEXT_CHARS characters either side of the first match in the paragraph. */
  context: string;
}

export const CONTEXT_CHARS = 90;

/** One whole-word, case-insensitive pattern per strict warning that has scan patterns. */
export function scanRules(taxonomy: Taxonomy): ScanRule[] {
  return taxonomy.contentWarnings
    .filter((w) => w.strict && w.scan?.length)
    .map((w) => ({
      id: w.id,
      label: w.label,
      pattern: new RegExp(`\\b(?:${(w.scan ?? []).join('|')})\\b`, 'i'),
    }));
}

const TIMESTAMP = /^(\d{2}:\d{2}:\d{2})\s*$/;

/** Paragraphs as the transcripts store them: a timestamp line, then "Speaker N: text". */
function paragraphs(text: string): { at: string; body: string }[] {
  const out: { at: string; body: string }[] = [];
  let at = '00:00:00';
  for (const block of text.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    const first = lines[0];
    if (first === undefined) continue;
    const ts = TIMESTAMP.exec(first);
    if (ts?.[1]) {
      at = ts[1];
      lines.shift();
    }
    const body = lines
      .join(' ')
      .replace(/^Speaker \d+:\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (body) out.push({ at, body });
  }
  return out;
}

function contextAround(body: string, index: number, length: number): string {
  const start = Math.max(0, index - CONTEXT_CHARS);
  const end = Math.min(body.length, index + length + CONTEXT_CHARS);
  return `${start > 0 ? '...' : ''}${body.slice(start, end)}${end < body.length ? '...' : ''}`;
}

/** At most one hit per warning and paragraph, in transcript order. */
export function scanText(text: string, part: number, rules: readonly ScanRule[]): ScanHit[] {
  const hits: ScanHit[] = [];
  for (const p of paragraphs(text)) {
    for (const rule of rules) {
      const m = rule.pattern.exec(p.body);
      if (m)
        hits.push({
          warning: rule.id,
          part,
          at: p.at,
          context: contextAround(p.body, m.index, m[0].length),
        });
    }
  }
  return hits;
}

/** Hits for a whole story, grouped by warning in taxonomy order. */
export function scanStory(
  texts: ReadonlyMap<number, string | null>,
  rules: readonly ScanRule[],
): Map<string, ScanHit[]> {
  const out = new Map<string, ScanHit[]>(rules.map((r) => [r.id, []]));
  for (const [part, text] of [...texts].sort(([a], [b]) => a - b)) {
    if (!text) continue;
    for (const hit of scanText(text, part, rules)) out.get(hit.warning)?.push(hit);
  }
  return out;
}

/**
 * Omny transcripts, cached in data/transcripts/<guid>.txt (git-ignored).
 *
 * The SubRip (SRT) version is preferred: Omny's plain-text version of many
 * episodes carries a single timestamp for the whole hour, which makes
 * evidence timestamps impossible. SRT cues are regrouped into paragraphs in
 * the same "HH:MM:SS / Speaker N: text" layout as the plain-text version.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Episode } from '../../shared/schemas/episode.ts';
import { sleep } from './io.ts';
import { TRANSCRIPTS_DIR } from './paths.ts';

/** Seconds between requests to Omny. */
export const REQUEST_GAP_MS = 1000;

export function transcriptPath(guid: string): string {
  return join(TRANSCRIPTS_DIR, `${guid.replace(/[^A-Za-z0-9_-]/g, '_')}.txt`);
}

export function readTranscript(guid: string): string | null {
  const path = transcriptPath(guid);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

/** A new paragraph starts on a speaker change or after this many seconds. */
const PARAGRAPH_SECONDS = 30;

const CUE_TIME = /^(\d{2}):(\d{2}):(\d{2})[,.]\d{3}\s*-->/;
const SPEAKER = /^(Speaker \d+):\s*/;

/** Converts SubRip cues to timestamped paragraphs. */
export function srtToText(srt: string): string {
  const paragraphs: { at: string; speaker: string; words: string[] }[] = [];
  let startSeconds = -Infinity;
  for (const block of srt.replace(/\r/g, '').split(/\n{2,}/)) {
    const lines = block.split('\n').filter((l) => l.trim());
    const timeIdx = lines.findIndex((l) => CUE_TIME.test(l));
    if (timeIdx < 0) continue;
    const m = CUE_TIME.exec(lines[timeIdx] ?? '');
    if (!m) continue;
    const seconds = Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
    let text = lines
      .slice(timeIdx + 1)
      .join(' ')
      .trim();
    const sp = SPEAKER.exec(text);
    const speaker = sp?.[1] ?? paragraphs.at(-1)?.speaker ?? 'Speaker';
    if (sp) text = text.slice(sp[0].length);
    if (!text) continue;
    const last = paragraphs.at(-1);
    if (last?.speaker !== speaker || seconds - startSeconds >= PARAGRAPH_SECONDS) {
      paragraphs.push({ at: `${m[1]}:${m[2]}:${m[3]}`, speaker, words: [text] });
      startSeconds = seconds;
    } else {
      last.words.push(text);
    }
  }
  return paragraphs.map((p) => `${p.at}\n${p.speaker}: ${p.words.join(' ')}\n`).join('\n');
}

/** Downloads the transcript if it is not cached. Returns 'cached' | 'fetched' | 'none' (no URL in the feed). */
export async function ensureTranscript(ep: Episode): Promise<'cached' | 'fetched' | 'none'> {
  if (existsSync(transcriptPath(ep.guid))) return 'cached';
  const url = ep.transcript_srt_url ?? ep.transcript_url;
  if (!url) return 'none';
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`transcript for "${ep.title}" answered HTTP ${res.status}`);
  const body = await res.text();
  mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  writeFileSync(transcriptPath(ep.guid), ep.transcript_srt_url ? srtToText(body) : body);
  await sleep(REQUEST_GAP_MS);
  return 'fetched';
}

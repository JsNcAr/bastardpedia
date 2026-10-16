/** Omny plain-text transcripts, cached in data/transcripts/<guid>.txt (git-ignored). */
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

/** Downloads the transcript if it is not cached. Returns 'cached' | 'fetched' | 'none' (no URL in the feed). */
export async function ensureTranscript(ep: Episode): Promise<'cached' | 'fetched' | 'none'> {
  if (existsSync(transcriptPath(ep.guid))) return 'cached';
  if (!ep.transcript_url) return 'none';
  const res = await fetch(ep.transcript_url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`transcript for "${ep.title}" answered HTTP ${res.status}`);
  mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  writeFileSync(transcriptPath(ep.guid), await res.text());
  await sleep(REQUEST_GAP_MS);
  return 'fetched';
}

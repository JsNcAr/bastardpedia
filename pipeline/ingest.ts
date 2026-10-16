/**
 * Download the Behind the Bastards RSS feed and write data/episodes.json.
 *
 *   node pipeline/ingest.ts              # fetch the live feed (cached to data/raw/podcast.rss)
 *   node pipeline/ingest.ts feed.rss     # parse a local copy instead
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { z } from 'zod';
import { EpisodeSchema, type Episode } from '../shared/schemas/episode.ts';
import { unescapeHtml } from './lib/html.ts';
import { toJson } from './lib/io.ts';
import { DATA_DIR, EPISODES_FILE, RAW_DIR } from './lib/paths.ts';

export const FEED_URL =
  'https://www.omnycontent.com/d/playlist/e73c998e-6e60-432f-8610-ae210140c5b1/' +
  'e5f91208-cc7e-4726-a312-ae280140ad11/d64f756d-6d5e-4fae-b24f-ae280140ad36/podcast.rss';

// Boilerplate appended to every description by iHeart/Omny.
const BOILERPLATE = [
  /See omnystudio\.com\/listener for privacy information\.?/g,
  /Learn more about your ad-choices at \S+/g,
  /You can now listen to all Cool Zone Media shows[\s\S]*$/g,
];

const MONTHS: Record<string, number> = {
  Jan: 1,
  Feb: 2,
  Mar: 3,
  Apr: 4,
  May: 5,
  Jun: 6,
  Jul: 7,
  Aug: 8,
  Sep: 9,
  Oct: 10,
  Nov: 11,
  Dec: 12,
};

/** RFC 2822 date -> ISO 8601 keeping the offset, like Python's parsedate_to_datetime().isoformat(). */
export function rfc2822ToIso(text: string): string {
  const m =
    /^(?:\w{3},\s*)?(\d{1,2})\s+(\w{3})\s+(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?\s+(?:([+-])(\d{2})(\d{2})|GMT|UTC|Z)$/.exec(
      text.trim(),
    );
  const month = m ? MONTHS[m[2] ?? ''] : undefined;
  if (!m || month === undefined) throw new Error(`unparseable pubDate: ${text}`);
  const pad = (n: number | string) => String(n).padStart(2, '0');
  const offset = m[7] ? `${m[7]}${m[8] ?? '00'}:${m[9] ?? '00'}` : '+00:00';
  return `${m[3] ?? ''}-${pad(month)}-${pad(m[1] ?? '')}T${m[4] ?? ''}:${m[5] ?? ''}:${m[6] ?? '00'}${offset}`;
}

export function cleanDescription(raw: string): string {
  let text = unescapeHtml(raw.replace(/<[^>]+>/g, ' '));
  for (const pattern of BOILERPLATE) text = text.replace(pattern, '');
  return text.replace(/\s+/g, ' ').trim();
}

type XmlNode = Record<string, unknown>;

/** Text content of an element that may carry attributes (`{ '#text': ..., '@_x': ... }`). */
function text(node: unknown): string | null {
  if (node === undefined || node === null) return null;
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'boolean') return String(node);
  if (typeof node === 'object' && '#text' in node) return text((node as XmlNode)['#text']);
  if (typeof node === 'object') return '';
  return null;
}

function attr(node: unknown, name: string): string | null {
  if (node && typeof node === 'object') {
    const v = (node as XmlNode)[`@_${name}`];
    return typeof v === 'string' ? v : null;
  }
  return null;
}

function parseItem(item: XmlNode): Episode {
  const transcripts = new Map<string, string>();
  for (const t of (item['podcast:transcript'] as unknown[] | undefined) ?? []) {
    const type = attr(t, 'type');
    const url = attr(t, 'url');
    if (type !== null && url !== null) transcripts.set(type, url);
  }
  const duration = text(item['itunes:duration']) ?? '';
  return {
    guid: text(item.guid) ?? '',
    title: (text(item.title) ?? '').trim(),
    published: rfc2822ToIso(text(item.pubDate) ?? ''),
    duration_s: /^\d+$/.test(duration) ? Number(duration) : null,
    description: cleanDescription(text(item.description) ?? ''),
    link: text(item.link),
    audio_url: attr(item.enclosure, 'url'),
    transcript_url: transcripts.get('text/plain') ?? null,
    transcript_srt_url: transcripts.get('application/srt') ?? null,
  };
}

export function parseFeed(xml: string): Episode[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    htmlEntities: false,
    isArray: (name) => name === 'item' || name === 'podcast:transcript',
  });
  const doc = parser.parse(xml) as { rss?: { channel?: { item?: XmlNode[] } } };
  const items = doc.rss?.channel?.item ?? [];
  const episodes = z.array(EpisodeSchema).parse(items.map(parseItem));
  // Stable sort on the ISO string, as the Python version did.
  return episodes.sort((a, b) =>
    a.published < b.published ? -1 : a.published > b.published ? 1 : 0,
  );
}

async function main(): Promise<void> {
  const source = process.argv[2];
  let xml: string;
  if (source && !source.startsWith('http')) {
    xml = readFileSync(source, 'utf8');
  } else {
    const res = await fetch(source ?? FEED_URL, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`feed answered HTTP ${res.status}`);
    xml = await res.text();
    mkdirSync(RAW_DIR, { recursive: true });
    writeFileSync(join(RAW_DIR, 'podcast.rss'), xml);
  }

  const episodes = parseFeed(xml);
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(EPISODES_FILE, toJson(episodes));
  const withTranscript = episodes.filter((e) => e.transcript_url).length;
  console.log(
    `${episodes.length} episodes (${withTranscript} with transcripts) -> ${EPISODES_FILE}`,
  );
}

if (import.meta.main) await main();

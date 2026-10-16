/**
 * Check every Wikidata QID in data/tags/ against the subject name it is attached to.
 *
 *   node pipeline/verify-wikidata.ts [id...]
 *
 * A QID passes when its English label or one of its English aliases matches the
 * subject name, ignoring case, diacritics and punctuation. Exits 1 on any mismatch
 * or unknown QID. Agents are told a wrong QID is worse than none; this enforces it.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { z } from 'zod';
import { readJson, sleep } from './lib/io.ts';
import { TAGS_DIR } from './lib/paths.ts';

const API = 'https://www.wikidata.org/w/api.php';
const BATCH = 50; // wbgetentities limit

const TagSubjects = z.object({
  subjects: z.array(z.object({ name: z.string(), wikidata: z.string().optional() })),
});

const EntitiesResponse = z.object({
  entities: z.record(
    z.string(),
    z.object({
      missing: z.string().optional(),
      labels: z.record(z.string(), z.object({ value: z.string() })).optional(),
      aliases: z.record(z.string(), z.array(z.object({ value: z.string() }))).optional(),
    }),
  ),
});

export function normalizeName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function namesMatch(subject: string, candidates: string[]): boolean {
  const want = normalizeName(subject);
  return candidates.some((c) => normalizeName(c) === want);
}

async function fetchNames(qids: string[]): Promise<Map<string, string[] | null>> {
  const out = new Map<string, string[] | null>();
  for (let i = 0; i < qids.length; i += BATCH) {
    const ids = qids.slice(i, i + BATCH);
    const url = `${API}?action=wbgetentities&format=json&props=labels|aliases&languages=en&ids=${ids.join('|')}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'bastardpedia-tag-verifier/0.1' } });
    if (!res.ok) throw new Error(`Wikidata answered HTTP ${res.status}`);
    const { entities } = EntitiesResponse.parse(await res.json());
    for (const id of ids) {
      const e = entities[id];
      if (!e || e.missing !== undefined) {
        out.set(id, null);
        continue;
      }
      out.set(
        id,
        [e.labels?.en?.value, ...(e.aliases?.en ?? []).map((a) => a.value)].filter(
          (v): v is string => Boolean(v),
        ),
      );
    }
    await sleep(500);
  }
  return out;
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const dirAt = argv.indexOf('--dir');
  const dirArg = dirAt >= 0 ? argv[dirAt + 1] : undefined;
  const dir = dirArg ? resolve(dirArg) : TAGS_DIR;
  const ids = argv.filter((a, i) => !a.startsWith('--') && (dirAt < 0 || i !== dirAt + 1));
  const files = ids.length
    ? ids.map((id) => join(dir, `${id}.json`))
    : existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith('.json'))
          .map((f) => join(dir, f))
      : [];

  const refs: { story: string; name: string; qid: string }[] = [];
  for (const file of files) {
    const parsed = TagSubjects.safeParse(readJson(file));
    if (!parsed.success) continue; // tags:validate reports malformed records
    for (const s of parsed.data.subjects)
      if (s.wikidata) refs.push({ story: basename(file, '.json'), name: s.name, qid: s.wikidata });
  }
  if (!refs.length) {
    console.log('tags:verify-wikidata: no Wikidata QIDs to check.');
    return;
  }

  const names = await fetchNames([...new Set(refs.map((r) => r.qid))]);
  let bad = 0;
  for (const r of refs) {
    const found = names.get(r.qid);
    if (found === null || found === undefined) {
      console.log(`FAIL ${r.story}: ${r.qid} does not exist (subject "${r.name}")`);
      bad++;
    } else if (!namesMatch(r.name, found)) {
      console.log(`FAIL ${r.story}: ${r.qid} is "${found[0] ?? '?'}", not "${r.name}"`);
      bad++;
    }
  }
  console.log(`tags:verify-wikidata: ${refs.length} QID(s), ${bad} problem(s)`);
  if (bad) process.exit(1);
}

if (import.meta.main) await main();

/**
 * Download plain-text transcripts for BtB stories into data/transcripts/.
 *
 *   node pipeline/fetch-transcripts.ts                 # every BtB story, skipping cached files
 *   node pipeline/fetch-transcripts.ts --story <id>    # one story's parts
 *   node pipeline/fetch-transcripts.ts --limit 20      # at most 20 downloads
 *
 * One request per second. Transcripts are copyrighted: they stay local, never committed or shipped.
 */
import { loadEpisodes, loadStories } from './lib/io.ts';
import { ensureTranscript } from './lib/transcripts.ts';

function option(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const storyId = option('story');
  const limit = Number(option('limit') ?? Infinity);
  const episodes = new Map(loadEpisodes().map((e) => [e.guid, e]));
  const stories = loadStories().filter(
    (s) => s.kind === 'episode' && (!storyId || s.id === storyId),
  );
  if (storyId && !stories.length) throw new Error(`no BtB story with id "${storyId}"`);

  const counts = { cached: 0, fetched: 0, none: 0 };
  outer: for (const story of stories) {
    for (const part of story.parts) {
      if (counts.fetched >= limit) break outer;
      const ep = episodes.get(part.guid);
      if (!ep) continue;
      const result = await ensureTranscript(ep);
      counts[result]++;
      if (result === 'fetched') console.log(`  fetched: ${ep.title}`);
      if (result === 'none') console.log(`  no transcript in feed: ${ep.title}`);
    }
  }
  console.log(
    `transcripts: ${counts.fetched} fetched, ${counts.cached} already cached, ${counts.none} without a transcript`,
  );
}

if (import.meta.main) await main();

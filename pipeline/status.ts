/**
 * Print pipeline counts.
 *
 *   node pipeline/status.ts                       # counts only
 *   node pipeline/status.ts --fail-on-untagged    # exit 1 if any BtB story has no tags (CI feed_sync)
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadEpisodes, loadStories } from './lib/io.ts';
import { TAGS_DIR } from './lib/paths.ts';

function main(): void {
  const episodes = loadEpisodes();
  const stories = loadStories();
  const byKind = new Map<string, number>();
  for (const s of stories) byKind.set(s.kind, (byKind.get(s.kind) ?? 0) + 1);
  const btb = stories.filter((s) => s.kind === 'episode');
  const untagged = btb.filter((s) => !existsSync(join(TAGS_DIR, `${s.id}.json`)));

  console.log(
    `episodes: ${episodes.length} (${episodes.filter((e) => e.transcript_url).length} with transcripts)`,
  );
  console.log(`stories: ${stories.length}`);
  for (const [k, v] of [...byKind].sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
  console.log(`BtB stories tagged: ${btb.length - untagged.length} of ${btb.length}`);

  if (process.argv.includes('--fail-on-untagged') && untagged.length) {
    console.log(
      `\n${untagged.length} untagged BtB stor${untagged.length === 1 ? 'y' : 'ies'} (newest first):`,
    );
    for (const s of [...untagged].reverse().slice(0, 50))
      console.log(`  ${s.first_published.slice(0, 10)}  ${s.id}`);
    if (untagged.length > 50) console.log(`  ... and ${untagged.length - 50} more`);
    console.log(
      '\nTag them with the btb-tagger subagent (docs/TAGGING.md), then commit data/tags/.',
    );
    process.exit(1);
  }
}

if (import.meta.main) main();

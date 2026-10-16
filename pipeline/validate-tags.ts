/**
 * Validate tag records in data/tags/.
 *
 *   node pipeline/validate-tags.ts            # every record
 *   node pipeline/validate-tags.ts <id>...    # only these stories
 *
 * Exits 1 when any record has errors. Warnings (e.g. an older minor taxonomy
 * version) are printed but do not fail.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { loadStories, readJson } from './lib/io.ts';
import { TAGS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { makeValidator } from './lib/validate.ts';

function main(): void {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const files = ids.length
    ? ids.map((id) => join(TAGS_DIR, `${id}.json`))
    : existsSync(TAGS_DIR)
      ? readdirSync(TAGS_DIR)
          .filter((f) => f.endsWith('.json'))
          .sort()
          .map((f) => join(TAGS_DIR, f))
      : [];

  if (!files.length) {
    console.log('tags:validate: no tag records in data/tags/ yet; nothing to check.');
    return;
  }

  const taxonomy = loadTaxonomy();
  const episodeStoryIds = new Set(
    loadStories()
      .filter((s) => s.kind === 'episode')
      .map((s) => s.id),
  );
  const validate = makeValidator({ taxonomy, episodeStoryIds });

  let failed = 0;
  let warned = 0;
  for (const file of files) {
    const id = basename(file, '.json');
    if (!existsSync(file)) {
      console.log(`FAIL ${id}\n  no file data/tags/${id}.json`);
      failed++;
      continue;
    }
    let data: unknown;
    try {
      data = readJson(file);
    } catch (e) {
      console.log(`FAIL ${id}\n  not valid JSON: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
      continue;
    }
    const { errors, warnings } = validate(data, id);
    if (errors.length) failed++;
    if (warnings.length) warned++;
    if (errors.length || warnings.length) {
      console.log(`${errors.length ? 'FAIL' : 'WARN'} ${id}`);
      for (const e of errors) console.log(`  error: ${e}`);
      for (const w of warnings) console.log(`  warning: ${w}`);
    }
  }
  console.log(
    `tags:validate: ${files.length} record(s), ${files.length - failed} ok, ${failed} failed, ${warned} with warnings (taxonomy ${taxonomy.version})`,
  );
  if (failed) process.exit(1);
}

if (import.meta.main) main();

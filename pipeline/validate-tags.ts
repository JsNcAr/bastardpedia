/**
 * Validate tag records in data/tags/.
 *
 *   node pipeline/validate-tags.ts            # every record
 *   node pipeline/validate-tags.ts <id>...    # only these stories
 *   node pipeline/validate-tags.ts --dir tagging/examples [<id>...]
 *
 * Exits 1 when any record has errors. Warnings (e.g. an older minor taxonomy
 * version) are printed but do not fail.
 */
import { existsSync, readdirSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { loadStories, readJson } from './lib/io.ts';
import { TAGS_DIR } from './lib/paths.ts';
import { loadTaxonomy } from './lib/taxonomy.ts';
import { makeValidator } from './lib/validate.ts';

function main(): void {
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
          .sort()
          .map((f) => join(dir, f))
      : [];

  if (!files.length) {
    console.log(`tags:validate: no tag records in ${dir} yet; nothing to check.`);
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

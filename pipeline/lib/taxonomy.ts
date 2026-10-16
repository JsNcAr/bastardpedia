/** Reads tagging/taxonomy/ from disk. Parsing lives in shared/taxonomy.ts. */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseTaxonomy,
  TAXONOMY_FILES,
  type Taxonomy,
  type TaxonomyFile,
} from '../../shared/taxonomy.ts';
import { TAXONOMY_DIR } from './paths.ts';

let cached: Taxonomy | null = null;

export function loadTaxonomy(): Taxonomy {
  if (cached) return cached;
  const sources = Object.fromEntries(
    TAXONOMY_FILES.map((f) => [f, readFileSync(join(TAXONOMY_DIR, f), 'utf8')]),
  ) as Record<TaxonomyFile, string>;
  cached = parseTaxonomy(readFileSync(join(TAXONOMY_DIR, 'VERSION'), 'utf8'), sources);
  return cached;
}

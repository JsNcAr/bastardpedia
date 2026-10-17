/**
 * The catalog format version, kept apart from the Zod schema so the browser can check a
 * catalog without bundling Zod. The catalog is fully validated when it is built
 * (pipeline/build-catalog.ts); the app only confirms it is the format it understands.
 */
import type { Catalog } from './catalog.ts';

export const CATALOG_SCHEMA = 'catalog/1' as const;

export function looksLikeCatalog(value: unknown): value is Catalog {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as { schema?: unknown; stories?: unknown; vocab?: unknown };
  return v.schema === CATALOG_SCHEMA && Array.isArray(v.stories) && typeof v.vocab === 'object';
}

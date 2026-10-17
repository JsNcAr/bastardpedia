import type { CatalogSource } from './catalog-source';
import { createLazyLibrary } from './lazy-library';
import type { LibraryRepository } from './library-model';
import { createStaticCatalogSource } from './static.adapter';

/**
 * The one place adapters are chosen. Everything else imports the interfaces.
 * Switching to the HTTP catalog when a backend exists is a change here only.
 */
let catalog: CatalogSource | null = null;
let library: LibraryRepository | null = null;

export function getCatalogSource(): CatalogSource {
  catalog ??= createStaticCatalogSource();
  return catalog;
}

export function getLibrary(): LibraryRepository {
  library ??= createLazyLibrary();
  return library;
}

export type { CatalogSource } from './catalog-source';
export { CatalogError } from './catalog-source';
export type { LibraryEntry, LibraryRepository, ListenStatus } from './library-model';
export { emptyEntry, isBlank } from './library-model';

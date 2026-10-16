import type { Catalog } from '@shared/schemas/catalog.ts';

/**
 * Where the catalog comes from. Components never import an adapter, only this
 * interface (through src/data/index.ts), so a static file today and an API
 * tomorrow look the same to them. See docs/ARCHITECTURE.md.
 */
export interface CatalogSource {
  load(): Promise<Catalog>;
}

export class CatalogError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = 'CatalogError';
  }
}

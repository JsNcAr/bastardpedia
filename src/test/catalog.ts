import { CatalogSchema, type Catalog } from '@shared/schemas/catalog.ts';
import raw from './fixtures/catalog.sample.json';

/** The sample catalog, parsed through the real schema. Sample stories have ids prefixed `sample-`. */
export const sampleCatalog: Catalog = CatalogSchema.parse(raw);

export const emptyCatalog: Catalog = { ...sampleCatalog, stories: [], countries: [] };

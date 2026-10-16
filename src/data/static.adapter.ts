import { CatalogSchema, type Catalog } from '@shared/schemas/catalog.ts';
import { CatalogError, type CatalogSource } from './catalog-source';

/** The catalog as a static file next to the app, built by `npm run build:catalog`. */
export function createStaticCatalogSource(
  url = '/data/catalog.json',
  fetchImpl: typeof fetch = fetch,
): CatalogSource {
  return {
    async load(): Promise<Catalog> {
      let res: Response;
      try {
        res = await fetchImpl(url, { headers: { Accept: 'application/json' } });
      } catch (e) {
        throw new CatalogError('The catalogue could not be reached. Check your connection.', e);
      }
      if (!res.ok) {
        throw new CatalogError(`The catalogue answered ${String(res.status)} ${res.statusText}.`);
      }
      const parsed = CatalogSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new CatalogError('The catalogue file does not match the expected format.', parsed.error);
      }
      return parsed.data;
    },
  };
}

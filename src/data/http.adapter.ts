import { CatalogSchema, type Catalog } from '@shared/schemas/catalog.ts';
import { CatalogError, type CatalogSource } from './catalog-source';

/**
 * The catalog from a future API (`GET /api/v1/catalog`, contract in docs/API.md).
 * Not wired in: it exists so the contract type-checks against the interface.
 * Switching is a one-line change in src/data/index.ts.
 */
export interface HttpOptions {
  baseUrl: string;
  token?: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
}

export function createHttpCatalogSource(opts: HttpOptions): CatalogSource {
  const fetchImpl = opts.fetchImpl ?? fetch;
  return {
    async load(): Promise<Catalog> {
      const token = opts.token ? await opts.token() : null;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetchImpl(`${opts.baseUrl}/api/v1/catalog`, { headers });
      if (!res.ok) throw new CatalogError(`The catalogue API answered ${String(res.status)}.`);
      const parsed = CatalogSchema.safeParse(await res.json());
      if (!parsed.success) throw new CatalogError('The catalogue API sent an unexpected format.', parsed.error);
      return parsed.data;
    },
  };
}

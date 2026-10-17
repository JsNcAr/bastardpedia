import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { Providers } from '@/app/Providers';
import { createQueryClient } from '@/app/queries';
import { createLibraryRepository, type LibraryRepository } from '@/data/library';
import { routes } from '@/routes';

let dbCount = 0;

/** Render the real routes at `url` with an in-memory catalog and a fresh (or given) library. */
export function renderApp(url: string, catalog: Catalog, library?: LibraryRepository) {
  const router = createMemoryRouter(routes, { initialEntries: [url] });
  const client = createQueryClient();
  const sources = {
    catalog: { load: () => Promise.resolve(catalog) },
    library: library ?? createLibraryRepository(`render-test-${String(++dbCount)}`),
  };
  const view = render(
    <Providers sources={sources} client={client}>
      <RouterProvider router={router} />
    </Providers>,
  );
  return { ...view, router };
}

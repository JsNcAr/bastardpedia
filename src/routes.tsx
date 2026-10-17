import type { RouteObject } from 'react-router';
import { AppShell } from './app/AppShell';
import { NotFound, RouteError } from './app/NotFound';
import { CatalogPage } from './features/catalog/CatalogPage';

/**
 * Browser-history routes; Caddy serves index.html for every path (docs/adr/0002).
 * The catalogue and story pages are in the main bundle; the Library and About pages load on demand.
 */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'stories/:id', element: <CatalogPage /> },
      {
        path: 'library',
        lazy: async () => ({
          Component: (await import('./features/library/LibraryPage')).LibraryPage,
        }),
      },
      {
        path: 'library/catch-up',
        lazy: async () => ({
          Component: (await import('./features/library/catch-up/CatchUpPage')).CatchUpPage,
        }),
      },
      {
        path: 'about',
        lazy: async () => ({ Component: (await import('./app/AboutPage')).AboutPage }),
      },
      { path: '*', element: <NotFound /> },
    ],
  },
];

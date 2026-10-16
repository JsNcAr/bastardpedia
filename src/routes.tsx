import type { RouteObject } from 'react-router';
import { AboutPage } from './app/AboutPage';
import { AppShell } from './app/AppShell';
import { NotFound, RouteError } from './app/NotFound';
import { CatalogPage } from './features/catalog/CatalogPage';
import { LibraryPage } from './features/library/LibraryPage';

/** Browser-history routes; Caddy serves index.html for every path (docs/adr/0002). */
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <CatalogPage /> },
      { path: 'stories/:id', element: <CatalogPage /> },
      { path: 'library', element: <LibraryPage /> },
      { path: 'about', element: <AboutPage /> },
      { path: '*', element: <NotFound /> },
    ],
  },
];

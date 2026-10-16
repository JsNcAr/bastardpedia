import { useState } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router';
import { Providers } from './app/Providers';
import { routes } from './routes';

export function App() {
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
}

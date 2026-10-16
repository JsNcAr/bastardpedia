import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { getCatalogSource, getLibrary } from '@/data';
import { DataContext, createQueryClient, type DataSources } from './queries';

export function Providers({
  children,
  sources,
  client,
}: {
  children: ReactNode;
  /** Tests inject fakes here; the app uses the adapters from src/data/index.ts. */
  sources?: DataSources;
  client?: QueryClient;
}) {
  const [value] = useState<DataSources>(
    () => sources ?? { catalog: getCatalogSource(), library: getLibrary() },
  );
  const [queryClient] = useState(() => client ?? createQueryClient());
  return (
    <DataContext.Provider value={value}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </DataContext.Provider>
  );
}

import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext } from 'react';
import type {
  CatalogSource,
  LibraryEntry,
  LibraryRepository,
  LibrarySnapshot,
  ListenStatus,
} from '@/data';

/**
 * Data reaches components through context, and reads go through TanStack
 * Query, so every screen gets loading, error and invalidation for free.
 * Nothing here knows which adapter is behind the interfaces.
 */

export interface DataSources {
  catalog: CatalogSource;
  library: LibraryRepository;
}

export const DataContext = createContext<DataSources | null>(null);

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // The catalog only changes with a release, the library only by mutation.
        staleTime: Infinity,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function useData(): DataSources {
  const data = useContext(DataContext);
  if (!data) throw new Error('useData must be used inside <Providers>.');
  return data;
}

/** Query keys, in one place so a mutation can name what it dirties. */
export const keys = {
  catalog: ['catalog'] as const,
  library: ['library'] as const,
  libraryEntry: (id: string) => ['library', id] as const,
};

export function useCatalog() {
  const { catalog } = useData();
  return useQuery({ queryKey: keys.catalog, queryFn: () => catalog.load() });
}

export function useLibrary() {
  const { library } = useData();
  return useQuery({ queryKey: keys.library, queryFn: () => library.list() });
}

export function useLibraryEntry(id: string) {
  const { library } = useData();
  return useQuery({ queryKey: keys.libraryEntry(id), queryFn: () => library.get(id) });
}

/** Save an entry, or tombstone it when it no longer holds anything. */
export function useSaveLibraryEntry() {
  const { library } = useData();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ entry, blank }: { entry: LibraryEntry; blank: boolean }) => {
      if (blank) {
        await library.remove(entry.id);
        return null;
      }
      return library.put(entry);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.library });
    },
  });
}

/** One status on many stories at once. Resolves to the snapshot an undo needs. */
export function useBulkStatus() {
  const { library } = useData();
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, status }: { ids: readonly string[]; status: ListenStatus | null }) =>
      library.setStatusMany(ids, status),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.library });
    },
  });
}

/** Undo a bulk write from its snapshot. */
export function useRestoreLibrary() {
  const { library } = useData();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (snapshot: LibrarySnapshot) => library.restore(snapshot),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: keys.library });
    },
  });
}

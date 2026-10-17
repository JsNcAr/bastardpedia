import type { LibraryEntry, LibraryRepository } from './library-model';

/**
 * The library repository, loaded on first use. Dexie (about 27 KB compressed)
 * stays out of the main bundle until a story page or the Library asks for the
 * visitor's marks.
 */
export function createLazyLibrary(dbName?: string): LibraryRepository {
  let repo: Promise<LibraryRepository> | null = null;
  const load = () =>
    (repo ??= import('./library').then((m) => m.createLibraryRepository(dbName)));
  return {
    list: async () => (await load()).list(),
    get: async (id: string) => (await load()).get(id),
    put: async (entity: LibraryEntry) => (await load()).put(entity),
    remove: async (id: string) => (await load()).remove(id),
    changedSince: async (iso: string) => (await load()).changedSince(iso),
    merge: async (records: LibraryEntry[]) => (await load()).merge(records),
  };
}

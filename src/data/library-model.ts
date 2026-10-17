/**
 * Library types and pure helpers, with no storage dependency, so the main
 * bundle can use them without loading Dexie (src/data/lazy-library.ts).
 */

export interface BaseRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type ListenStatus = 'want' | 'listened';

export interface LibraryEntry extends BaseRecord {
  /** The story id. One entry per story. */
  id: string;
  status: ListenStatus | null;
  favourite: boolean;
  note: string;
}

export interface Crud<T extends BaseRecord> {
  /** Live records only. */
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  /** Upsert. `createdAt` is kept, `updatedAt` is set here. */
  put(entity: T): Promise<T>;
  /** Soft delete. */
  remove(id: string): Promise<void>;
  /** Every record changed after `iso`, tombstones included. The sync primitive. */
  changedSince(iso: string): Promise<T[]>;
}

export interface LibraryRepository extends Crud<LibraryEntry> {
  /**
   * Write records as given, timestamps kept, where each is newer than what is
   * stored (last writer wins, tombstones included). Returns how many were written.
   * Used to import a backup.
   */
  merge(records: LibraryEntry[]): Promise<number>;
}

export function emptyEntry(storyId: string, now = new Date().toISOString()): LibraryEntry {
  return { id: storyId, status: null, favourite: false, note: '', createdAt: now, updatedAt: now, deletedAt: null };
}

/** An entry with nothing in it is not worth keeping. */
export const isBlank = (e: LibraryEntry) => e.status === null && !e.favourite && e.note.trim() === '';

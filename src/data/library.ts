import Dexie, { type EntityTable } from 'dexie';

/**
 * Personal data: what you want to hear, what you have heard, favourites and
 * notes. It lives only in this browser (IndexedDB via Dexie). Records are
 * tombstoned instead of deleted and carry `updatedAt`, so a later server sync
 * can use `changedSince` without a migration. Same shape as ChronoTeach's Crud.
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

export type LibraryRepository = Crud<LibraryEntry>;

class LibraryDb extends Dexie {
  declare entries: EntityTable<LibraryEntry, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ entries: 'id, updatedAt, status, favourite' });
  }
}

export function emptyEntry(storyId: string, now = new Date().toISOString()): LibraryEntry {
  return { id: storyId, status: null, favourite: false, note: '', createdAt: now, updatedAt: now, deletedAt: null };
}

/** An entry with nothing in it is not worth keeping. */
export const isBlank = (e: LibraryEntry) => e.status === null && !e.favourite && e.note.trim() === '';

export function createLibraryRepository(dbName = 'btb-library'): LibraryRepository {
  const db = new LibraryDb(dbName);
  const now = () => new Date().toISOString();

  return {
    async list() {
      const all = await db.entries.toArray();
      return all.filter((e) => e.deletedAt === null);
    },
    async get(id) {
      const e = await db.entries.get(id);
      return e?.deletedAt === null ? e : null;
    },
    async put(entity) {
      const existing = await db.entries.get(entity.id);
      const record: LibraryEntry = {
        ...entity,
        createdAt: existing?.createdAt ?? entity.createdAt,
        updatedAt: now(),
        deletedAt: null,
      };
      await db.entries.put(record);
      return record;
    },
    async remove(id) {
      const existing = await db.entries.get(id);
      if (!existing) return;
      const stamp = now();
      await db.entries.put({ ...existing, updatedAt: stamp, deletedAt: stamp });
    },
    async changedSince(iso) {
      return db.entries.where('updatedAt').above(iso).toArray();
    },
  };
}

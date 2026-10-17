import Dexie, { type EntityTable } from 'dexie';
import type { LibraryEntry, LibraryRepository } from './library-model';

export type { BaseRecord, Crud, LibraryEntry, LibraryRepository, ListenStatus } from './library-model';
export { emptyEntry, isBlank } from './library-model';

/**
 * Personal data: what you want to hear, what you have heard, favourites and
 * notes. It lives only in this browser (IndexedDB via Dexie). Records are
 * tombstoned instead of deleted and carry `updatedAt`, so a later server sync
 * can use `changedSince` without a migration. Same shape as ChronoTeach's Crud.
 */

class LibraryDb extends Dexie {
  declare entries: EntityTable<LibraryEntry, 'id'>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({ entries: 'id, updatedAt, status, favourite' });
  }
}

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
    async merge(records) {
      return db.transaction('rw', db.entries, async () => {
        let written = 0;
        for (const record of records) {
          const existing = await db.entries.get(record.id);
          if (existing && existing.updatedAt >= record.updatedAt) continue;
          await db.entries.put(record);
          written += 1;
        }
        return written;
      });
    },
  };
}

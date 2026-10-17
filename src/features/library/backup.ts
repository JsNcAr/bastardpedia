import {
  LIBRARY_BACKUP_SCHEMA,
  LibraryBackupSchema,
  type LibraryBackup,
} from '@shared/schemas/library-backup.ts';
import type { LibraryEntry } from '@/data';

/** Every record, tombstones included, so a merge elsewhere sees deletions too. */
export function toBackup(entries: LibraryEntry[], now = new Date()): LibraryBackup {
  return { schema: LIBRARY_BACKUP_SCHEMA, exported_at: now.toISOString(), entries };
}

export function backupFileName(now = new Date()): string {
  return `${__APP_SLUG__}-library-${now.toISOString().slice(0, 10)}.json`;
}

export class BackupError extends Error {}

export function parseBackup(text: string): LibraryBackup {
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new BackupError('That file is not JSON.');
  }
  const result = LibraryBackupSchema.safeParse(body);
  if (!result.success) throw new BackupError('That file is not a library backup from this site.');
  return result.data;
}

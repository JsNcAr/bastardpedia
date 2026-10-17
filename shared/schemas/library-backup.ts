/**
 * A library backup file: every entry from the browser's IndexedDB, tombstones
 * included, so importing on another device can merge by `updatedAt`.
 */
import { z } from 'zod';

export const LIBRARY_BACKUP_SCHEMA = 'library-backup/1' as const;

export const LibraryEntrySchema = z.object({
  id: z.string().min(1),
  status: z.enum(['want', 'listened']).nullable(),
  favourite: z.boolean(),
  note: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable(),
});

export const LibraryBackupSchema = z.object({
  schema: z.literal(LIBRARY_BACKUP_SCHEMA),
  exported_at: z.iso.datetime(),
  entries: z.array(LibraryEntrySchema),
});
export type LibraryBackup = z.infer<typeof LibraryBackupSchema>;

import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent } from 'react';
import { keys, useData } from '@/app/queries';
import { Icon } from '@/ui/Icon';
import { BackupError, backupFileName, parseBackup, toBackup } from './backup';

const EPOCH = '1970-01-01T00:00:00.000Z';

type Outcome = { kind: 'done'; text: string } | { kind: 'error'; text: string } | null;

/** Export the library to a JSON file and merge one back in, newest edit winning. */
export function LibraryBackup({ hasEntries }: { hasEntries: boolean }) {
  const { library } = useData();
  const client = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function exportFile() {
    const entries = await library.changedSince(EPOCH);
    const blob = new Blob([JSON.stringify(toBackup(entries), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = backupFileName();
    link.click();
    URL.revokeObjectURL(url);
    setOutcome({ kind: 'done', text: `Exported ${String(entries.length)} entries.` });
  }

  async function importFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const backup = parseBackup(await file.text());
      const written = await library.merge(backup.entries);
      await client.invalidateQueries({ queryKey: keys.library });
      const kept = backup.entries.length - written;
      setOutcome({
        kind: 'done',
        text:
          `Imported ${String(written)} of ${String(backup.entries.length)} entries.` +
          (kept > 0
            ? ` ${String(kept)} were older than what this browser has, so they were skipped.`
            : ''),
      });
    } catch (error) {
      setOutcome({
        kind: 'error',
        text: error instanceof BackupError ? error.message : 'The file could not be read.',
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="backup" aria-labelledby="backup-title">
      <h2 id="backup-title" className="section-title">
        Backup
      </h2>
      <p className="backup-lead">
        Move your library to another browser, or keep a copy. Importing merges: for each story the
        most recent edit wins.
      </p>
      <div className="button-row">
        <button
          type="button"
          className="button"
          disabled={!hasEntries}
          onClick={() => void exportFile()}
        >
          <Icon name="download" />
          Export to a file
        </button>
        <button
          type="button"
          className="button"
          aria-busy={busy || undefined}
          disabled={busy}
          onClick={() => fileInput.current?.click()}
        >
          <Icon name="upload" />
          Import a backup
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => void importFile(e)}
        />
      </div>
      <p
        className={outcome?.kind === 'error' ? 'field-error backup-outcome' : 'backup-outcome'}
        role={outcome?.kind === 'error' ? 'alert' : 'status'}
      >
        {outcome?.text}
      </p>
    </section>
  );
}

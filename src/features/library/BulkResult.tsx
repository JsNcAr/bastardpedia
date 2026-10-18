import { useState } from 'react';
import { useRestoreLibrary } from '@/app/queries';
import type { LibrarySnapshot, ListenStatus } from '@/data';
import { Icon } from '@/ui/Icon';

/** What a bulk write did, kept until dismissed so there's time to undo it. */
export interface BulkOutcome {
  status: ListenStatus | null;
  snapshot: LibrarySnapshot;
  /** Overrides the generated text, for writes that did more than one thing. */
  message?: string;
}

const DONE: Record<'want' | 'listened' | 'none', string> = {
  listened: 'as listened',
  want: 'as want to listen',
  none: 'with no status',
};

const bulkMessage = (o: BulkOutcome) => {
  if (o.message) return o.message;
  const n = o.snapshot.length;
  return `Marked ${String(n)} ${n === 1 ? 'story' : 'stories'} ${DONE[o.status ?? 'none']}.`;
};

/**
 * The result of a bulk mark, with Undo. A status region, never a timed toast:
 * it stays until it is dismissed or replaced (WCAG 2.2.1).
 */
export function BulkResult({
  outcome,
  onDismiss,
}: {
  outcome: BulkOutcome | null;
  onDismiss: () => void;
}) {
  const restore = useRestoreLibrary();
  // Which outcome was undone: a later outcome gets its own Undo.
  const [undone, setUndone] = useState<BulkOutcome | null>(null);
  const isUndone = outcome !== null && undone === outcome;
  return (
    <div className="bulk-result" role="status">
      {outcome ? (
        <>
          <Icon name="check" size="sm" />
          <span className="bulk-result-text">{isUndone ? 'Undone.' : bulkMessage(outcome)}</span>
          {isUndone ? null : (
            <button
              type="button"
              className="button button-compact"
              disabled={restore.isPending}
              onClick={() =>
                restore.mutate(outcome.snapshot, { onSuccess: () => setUndone(outcome) })
              }
            >
              <Icon name="rotate-ccw" size="sm" />
              Undo
            </button>
          )}
          <button type="button" className="icon-button" aria-label="Dismiss" onClick={onDismiss}>
            <Icon name="x" size="sm" />
          </button>
        </>
      ) : null}
    </div>
  );
}

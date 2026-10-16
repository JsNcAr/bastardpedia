import { useId, useState } from 'react';
import { useLibraryEntry, useSaveLibraryEntry } from '@/app/queries';
import { emptyEntry, isBlank, type LibraryEntry, type ListenStatus } from '@/data';
import { Icon } from '@/ui/Icon';

/** Your own marks on a story. Stored only in this browser. */
export function LibraryControls({ storyId }: { storyId: string }) {
  const entryQuery = useLibraryEntry(storyId);
  const save = useSaveLibraryEntry();
  const entry = entryQuery.data ?? emptyEntry(storyId);
  const titleId = useId();

  const commit = (next: LibraryEntry) => save.mutate({ entry: next, blank: isBlank(next) });
  const toggleStatus = (status: ListenStatus) =>
    commit({ ...entry, status: entry.status === status ? null : status });
  const busy = entryQuery.isPending || save.isPending;

  return (
    <section className="library-controls" aria-labelledby={titleId}>
      <h3 id={titleId} className="section-title">
        Your library
      </h3>
      <div className="button-row" role="group" aria-label="Listening status">
        <button
          type="button"
          className="button"
          aria-pressed={entry.status === 'want'}
          disabled={busy}
          onClick={() => toggleStatus('want')}
        >
          <Icon name="bookmark" size="sm" />
          Want to listen
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={entry.status === 'listened'}
          disabled={busy}
          onClick={() => toggleStatus('listened')}
        >
          <Icon name="bookmark-check" size="sm" />
          Listened
        </button>
        <button
          type="button"
          className="button"
          aria-pressed={entry.favourite}
          disabled={busy}
          onClick={() => commit({ ...entry, favourite: !entry.favourite })}
        >
          <Icon name="heart" size="sm" />
          Favourite
        </button>
      </div>
      {entryQuery.isPending ? null : (
        // Keyed by story so the draft starts from the stored note, and resets on another story.
        <NoteForm
          key={storyId}
          entry={entry}
          busy={busy}
          onSave={(next, done) =>
            save.mutate({ entry: next, blank: isBlank(next) }, { onSuccess: done })
          }
          saving={save.isPending}
        />
      )}
      {save.isError ? (
        <p role="alert" className="field-error">
          That change could not be saved. Your browser may be blocking site storage.
        </p>
      ) : null}
    </section>
  );
}

function NoteForm({
  entry,
  busy,
  saving,
  onSave,
}: {
  entry: LibraryEntry;
  busy: boolean;
  saving: boolean;
  onSave: (next: LibraryEntry, done: () => void) => void;
}) {
  const [note, setNote] = useState(entry.note);
  const [saved, setSaved] = useState(false);
  const noteId = useId();
  return (
    <form
      className="note-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave({ ...entry, note }, () => setSaved(true));
      }}
    >
      <label htmlFor={noteId} className="field-label">
        Note
      </label>
      <textarea
        id={noteId}
        className="textarea"
        rows={3}
        value={note}
        placeholder="Anything you want to remember about this story"
        onChange={(e) => {
          setNote(e.target.value);
          setSaved(false);
        }}
      />
      <div className="note-actions">
        <button
          type="submit"
          className="button"
          disabled={busy || note === entry.note}
          aria-busy={saving || undefined}
        >
          {saving ? 'Saving' : 'Save note'}
        </button>
        <span role="status" className="note-status">
          {saved ? 'Note saved in this browser.' : ''}
        </span>
      </div>
    </form>
  );
}

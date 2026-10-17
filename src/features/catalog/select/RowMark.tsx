import { useSaveLibraryEntry } from '@/app/queries';
import { emptyEntry, isBlank, type LibraryEntry } from '@/data';
import { Icon } from '@/ui/Icon';

/**
 * The control beside a result row: a one-tap Listened toggle, or in select mode
 * a checkbox. A sibling of the row link, never inside it, so neither control is
 * nested in another.
 */
export function RowMark({
  storyId,
  title,
  entry,
  selecting,
  checked,
  onCheck,
}: {
  storyId: string;
  title: string;
  entry: LibraryEntry | undefined;
  selecting: boolean;
  checked: boolean;
  onCheck: (id: string, on: boolean) => void;
}) {
  const save = useSaveLibraryEntry();
  if (selecting) {
    return (
      <label className="row-mark row-check">
        <input
          type="checkbox"
          checked={checked}
          aria-label={`Select: ${title}`}
          onChange={(e) => onCheck(storyId, e.currentTarget.checked)}
        />
      </label>
    );
  }
  const current = entry ?? emptyEntry(storyId);
  const on = current.status === 'listened';
  return (
    <button
      type="button"
      className="row-mark icon-button"
      aria-pressed={on}
      aria-label={`Listened: ${title}`}
      title={on ? 'Listened. Press to unmark' : 'Mark as listened'}
      disabled={save.isPending}
      onClick={() => {
        const next = { ...current, status: on ? null : ('listened' as const) };
        save.mutate({ entry: next, blank: isBlank(next) });
      }}
    >
      <Icon name={on ? 'bookmark-check' : 'bookmark'} size="sm" />
    </button>
  );
}

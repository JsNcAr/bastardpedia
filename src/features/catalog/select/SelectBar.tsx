import type { ListenStatus } from '@/data';
import { Icon } from '@/ui/Icon';

/**
 * Select mode's actions, stuck to the bottom of the results: the count, select
 * all shown, and the bulk marks. The selection outlives filter changes, so it can
 * be built up across several searches.
 */
export function SelectBar({
  count,
  shown,
  busy,
  onSelectShown,
  onClear,
  onMark,
  onDone,
}: {
  count: number;
  shown: number;
  busy: boolean;
  onSelectShown: () => void;
  onClear: () => void;
  onMark: (status: ListenStatus | null) => void;
  onDone: () => void;
}) {
  const none = count === 0 || busy;
  return (
    <div className="select-bar" role="region" aria-label="Selection">
      <p className="select-count" aria-live="polite">
        {count === 1 ? '1 selected' : `${String(count)} selected`}
      </p>
      <button type="button" className="button button-compact" onClick={onSelectShown}>
        Select all {shown}
      </button>
      <button
        type="button"
        className="button button-compact"
        disabled={count === 0}
        onClick={onClear}
      >
        Clear
      </button>
      <button
        type="button"
        className="button button-compact button-quiet select-done"
        onClick={onDone}
      >
        Done
      </button>
      <div
        className="button-row select-actions"
        role="group"
        aria-label="Mark the selected stories"
      >
        <button
          type="button"
          className="button button-compact button-primary"
          disabled={none}
          onClick={() => onMark('listened')}
        >
          <Icon name="bookmark-check" size="sm" />
          Mark listened
        </button>
        <button
          type="button"
          className="button button-compact"
          disabled={none}
          onClick={() => onMark('want')}
        >
          <Icon name="bookmark" size="sm" />
          Want to listen
        </button>
        <button
          type="button"
          className="button button-compact"
          disabled={none}
          onClick={() => onMark(null)}
        >
          Unmark
        </button>
      </div>
    </div>
  );
}

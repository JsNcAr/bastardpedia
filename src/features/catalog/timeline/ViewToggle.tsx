import type { Filters, ViewKey } from '../filter-model';

const LABELS: Record<ViewKey, string> = { list: 'List', timeline: 'Timeline' };

/** List or timeline: two ways to show the same results. */
export function ViewToggle({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  return (
    <div className="segmented" role="group" aria-label="Show results as">
      {(['list', 'timeline'] as const).map((v) => (
        <button
          key={v}
          type="button"
          className="segmented-option"
          aria-pressed={filters.view === v}
          onClick={() => onChange({ ...filters, view: v })}
        >
          {LABELS[v]}
        </button>
      ))}
    </div>
  );
}

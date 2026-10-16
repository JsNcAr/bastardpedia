import { resolvedSort, type Filters, type SortKey } from './filter-model';

const LABELS: Record<SortKey, string> = {
  relevance: 'Best match',
  newest: 'Newest',
  oldest: 'Oldest',
  chronological: 'By period',
};

export function SortControl({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters) => void;
}) {
  const current = resolvedSort(filters);
  const options: SortKey[] = filters.q
    ? ['relevance', 'newest', 'oldest', 'chronological']
    : ['newest', 'oldest', 'chronological'];
  return (
    <div className="segmented" role="group" aria-label="Sort stories">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className="segmented-option"
          aria-pressed={current === o}
          onClick={() => onChange({ ...filters, sort: o })}
        >
          {LABELS[o]}
        </button>
      ))}
    </div>
  );
}

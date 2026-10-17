import { Icon } from '@/ui/Icon';
import {
  EMPTY_FILTERS,
  FACETS,
  activeCount,
  toggleHiddenWarning,
  toggleValue,
  type Filters,
} from './filter-model';
import { formatYear } from './format';
import type { Labels } from './labels';

export function ActiveFilters({
  filters,
  labels,
  onChange,
}: {
  filters: Filters;
  labels: Labels;
  onChange: (next: Filters) => void;
}) {
  if (activeCount(filters) === 0) return null;
  const chips: { key: string; label: string; remove: () => Filters }[] = [];
  if (filters.q)
    chips.push({ key: 'q', label: `Search: ${filters.q}`, remove: () => ({ ...filters, q: '' }) });
  for (const facet of FACETS) {
    for (const v of filters[facet]) {
      const value = String(v);
      chips.push({
        key: `${facet}:${value}`,
        label: labels.of(facet, value),
        remove: () => toggleValue(filters, facet, value),
      });
    }
  }
  if (filters.yearFrom !== null || filters.yearTo !== null) {
    const from = filters.yearFrom === null ? 'any time' : formatYear(filters.yearFrom);
    const to = filters.yearTo === null ? 'now' : formatYear(filters.yearTo);
    chips.push({
      key: 'years',
      label: `Years: ${from} to ${to}`,
      remove: () => ({ ...filters, yearFrom: null, yearTo: null }),
    });
  }
  if (filters.reviewedOnly) {
    chips.push({
      key: 'reviewed',
      label: 'Reviewed only',
      remove: () => ({ ...filters, reviewedOnly: false }),
    });
  }
  if (filters.hideListened) {
    chips.push({
      key: 'listened',
      label: 'Hiding listened',
      remove: () => ({ ...filters, hideListened: false }),
    });
  }
  for (const w of filters.cwHide) {
    chips.push({
      key: `cw:${w}`,
      label: `Hiding: ${labels.warning(w)}`,
      remove: () => toggleHiddenWarning(filters, w),
    });
  }
  return (
    <div className="active-filters">
      <h2 className="visually-hidden">Active filters</h2>
      <ul className="chips">
        {chips.map((c) => (
          <li key={c.key}>
            <button
              type="button"
              className="chip"
              onClick={() => onChange(c.remove())}
              aria-label={`Remove filter: ${c.label}`}
            >
              <span>{c.label}</span>
              <Icon name="x" size="sm" />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="button button-quiet"
        onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
      >
        <Icon name="rotate-ccw" size="sm" />
        Clear all
      </button>
    </div>
  );
}

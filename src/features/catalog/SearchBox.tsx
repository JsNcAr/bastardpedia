import { Icon } from '@/ui/Icon';
import type { Filters } from './filter-model';

/**
 * The story search. One instance per page: in the rail on wide screens, above
 * the results on narrow ones, so the input id stays unique.
 */
export function SearchBox({
  filters,
  onChange,
}: {
  filters: Filters;
  onChange: (next: Filters, opts?: { replace?: boolean }) => void;
}) {
  return (
    <form className="search" role="search" onSubmit={(e) => e.preventDefault()}>
      <label className="search-label" htmlFor="story-search">
        Search stories
      </label>
      <div className="search-field">
        <Icon name="search" size="sm" />
        <input
          id="story-search"
          type="search"
          className="search-input"
          placeholder="Name, place or keyword"
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value }, { replace: true })}
          autoComplete="off"
          aria-keyshortcuts="/"
        />
      </div>
    </form>
  );
}

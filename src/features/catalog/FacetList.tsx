import { useId, useState } from 'react';
import {
  DEFAULT_LIMIT,
  FIND_FROM,
  firstOptions,
  grouped,
  matchesQuery,
  needsToggle,
  topOptions,
  type ListOption,
} from './facet-list';
import { FacetOption } from './FacetOption';

export interface FacetListOption extends ListOption {
  shortLabel?: string;
}

/**
 * A filter list that starts short: the options with the most stories (or, for
 * ordered lists such as centuries, the first ones), every checked option, and a
 * "Show all" button for the rest. Long lists get a find box when expanded.
 * Rules in facet-list.ts; expansion is UI state, so it stays out of the URL.
 */
export function FacetList({
  options,
  noun,
  onToggle,
  limit = DEFAULT_LIMIT,
  collapse = 'top',
  variant = 'row',
}: {
  options: FacetListOption[];
  /** Plural, lower case: "themes", "countries". */
  noun: string;
  onToggle: (id: string) => void;
  limit?: number;
  collapse?: 'top' | 'first';
  variant?: 'row' | 'chip';
}) {
  const id = useId();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const toggle = needsToggle(options.length, limit);
  const open = expanded || !toggle;
  const findable = open && toggle && options.length > FIND_FROM;
  const listClass = variant === 'chip' ? 'facet-chips' : 'facet-options';

  const render = (o: FacetListOption) => (
    <FacetOption
      key={o.id}
      label={o.label}
      shortLabel={o.shortLabel}
      count={o.count}
      checked={o.checked}
      onToggle={() => onToggle(o.id)}
      variant={variant}
    />
  );

  const shown = open
    ? options.filter((o) => matchesQuery(o.label, query))
    : collapse === 'first'
      ? firstOptions(options, limit)
      : topOptions(options, limit);
  const groups = open ? grouped(shown) : [];
  const hasHeadings = groups.length > 1 || (groups[0] !== undefined && groups[0][0] !== '');

  return (
    <div className="facet-list" id={id}>
      {findable ? (
        <input
          type="search"
          className="facet-find"
          aria-label={`Find ${noun}`}
          placeholder={`Find ${noun}`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
      ) : null}
      {open && hasHeadings ? (
        groups.map(([group, items]) => (
          <div key={group} className="facet-subgroup">
            {group ? <h3 className="facet-subtitle">{group}</h3> : null}
            <ul className={listClass}>{items.map(render)}</ul>
          </div>
        ))
      ) : (
        <ul className={listClass}>{shown.map(render)}</ul>
      )}
      {open && shown.length === 0 ? <p className="facet-hint">No {noun} match.</p> : null}
      {toggle ? (
        <button
          type="button"
          className="facet-more"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => {
            setExpanded((v) => !v);
            setQuery('');
          }}
        >
          {expanded ? 'Show fewer' : `Show all ${String(options.length)} ${noun}`}
        </button>
      ) : null}
    </div>
  );
}

import { useMemo } from 'react';
import type { Catalog, Term } from '@shared/schemas/catalog.ts';
import { Icon } from '@/ui/Icon';
import { FacetGroup, FacetSubgroup } from './FacetGroup';
import { FacetOption } from './FacetOption';
import { toggleHiddenWarning, toggleValue, type Facet, type Filters } from './filter-model';
import { centuryLabel } from './format';
import { YearRange } from './YearRange';
import type { Labels } from './labels';

interface Props {
  catalog: Catalog;
  filters: Filters;
  counts: Record<Facet, Map<string, number>>;
  warnings: Map<string, number>;
  reviewed: number;
  yearBounds: { min: number; max: number };
  labels: Labels;
  onChange: (next: Filters, opts?: { replace?: boolean }) => void;
}

function groupBy<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const out = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    out.set(k, [...(out.get(k) ?? []), item]);
  }
  return [...out];
}

export function FacetRail({
  catalog,
  filters,
  counts,
  warnings,
  reviewed,
  yearBounds,
  labels,
  onChange,
}: Props) {
  const isOn = (facet: Facet, value: string) =>
    facet === 'century' ? filters.century.includes(Number(value)) : filters[facet].includes(value);
  const count = (facet: Facet, value: string) => counts[facet].get(value) ?? 0;
  /** Options with stories, plus anything selected even if it now has none. */
  const visible = (facet: Facet, value: string) => count(facet, value) > 0 || isOn(facet, value);

  const option = (facet: Facet, value: string, label?: string) =>
    visible(facet, value) ? (
      <FacetOption
        key={value}
        label={label ?? labels.of(facet, value)}
        count={count(facet, value)}
        checked={isOn(facet, value)}
        onToggle={() => onChange(toggleValue(filters, facet, value))}
      />
    ) : null;

  const terms = (facet: Facet, list: Term[]) =>
    groupBy(
      list.filter((t) => visible(facet, t.id)),
      (t) => t.group ?? '',
    ).map(([group, items]) => (
      <FacetSubgroup key={group} title={group || undefined}>
        {items.map((t) => option(facet, t.id, t.label))}
      </FacetSubgroup>
    ));

  const globalEras = catalog.eras.filter((e) => e.scope === 'global' && visible('era', e.id));
  const regionalEras = groupBy(
    catalog.eras.filter((e) => e.scope === 'regional' && visible('era', e.id)),
    (e) => e.region_hint ?? 'Other',
  );
  const centuries = useMemo(
    () =>
      [...new Set([...counts.century.keys(), ...filters.century.map(String)])]
        .map(Number)
        .sort((a, b) => a - b),
    [counts.century, filters.century],
  );
  const countriesByContinent = groupBy(
    [...catalog.countries]
      .filter((c) => visible('country', c.code))
      .sort((a, b) => a.name.localeCompare(b.name)),
    (c) => c.continent,
  ).sort(([a], [b]) => a.localeCompare(b));
  const continents = [...new Set(catalog.countries.map((c) => c.continent))].sort();

  return (
    <div className="facet-rail">
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
          />
        </div>
      </form>

      <ul className="facet-review">
        <FacetOption
          label="Reviewed by a person only"
          count={reviewed}
          checked={filters.reviewedOnly}
          onToggle={() => onChange({ ...filters, reviewedOnly: !filters.reviewedOnly })}
        />
      </ul>

      <FacetGroup
        title="Period"
        selected={
          filters.era.length +
          filters.century.length +
          (filters.yearFrom !== null || filters.yearTo !== null ? 1 : 0)
        }
        defaultOpen
      >
        <FacetSubgroup title="Years covered" list={false}>
          <YearRange
            min={yearBounds.min}
            max={yearBounds.max}
            from={filters.yearFrom}
            to={filters.yearTo}
            onChange={(yearFrom, yearTo, live) =>
              onChange({ ...filters, yearFrom, yearTo }, { replace: live })
            }
          />
        </FacetSubgroup>
        <FacetSubgroup title="Broad periods">
          {globalEras.map((e) => option('era', e.id, e.label))}
        </FacetSubgroup>
        {regionalEras.map(([region, eras]) => (
          <FacetSubgroup key={region} title={`Named eras: ${region}`}>
            {eras.map((e) => option('era', e.id, e.label))}
          </FacetSubgroup>
        ))}
        <FacetSubgroup title="Centuries">
          {centuries.map((c) => option('century', String(c), centuryLabel(c)))}
        </FacetSubgroup>
      </FacetGroup>

      <FacetGroup title="Theme" selected={filters.theme.length} defaultOpen>
        {terms('theme', catalog.vocab.themes)}
      </FacetGroup>

      <FacetGroup title="Who they were" selected={filters.role.length}>
        {terms('role', catalog.vocab.roles)}
      </FacetGroup>

      <FacetGroup title="Region" selected={filters.continent.length + filters.country.length}>
        <FacetSubgroup title="Continents">
          {continents.map((c) => option('continent', c))}
        </FacetSubgroup>
        {countriesByContinent.map(([continent, list]) => (
          <FacetSubgroup key={continent} title={`Countries: ${continent}`}>
            {list.map((c) => option('country', c.code, c.name))}
          </FacetSubgroup>
        ))}
      </FacetGroup>

      <FacetGroup title="Episode type" selected={filters.format.length}>
        {terms('format', catalog.vocab.formats)}
      </FacetGroup>

      <FacetGroup title="Content warnings" selected={filters.cwHide.length}>
        <p className="facet-hint">Hide stories that spend real time on:</p>
        <FacetSubgroup>
          {catalog.vocab.content_warnings
            .filter((w) => (warnings.get(w.id) ?? 0) > 0 || filters.cwHide.includes(w.id))
            .map((w) => (
              <FacetOption
                key={w.id}
                label={w.label}
                count={warnings.get(w.id) ?? 0}
                checked={filters.cwHide.includes(w.id)}
                onToggle={() => onChange(toggleHiddenWarning(filters, w.id))}
              />
            ))}
        </FacetSubgroup>
      </FacetGroup>
    </div>
  );
}

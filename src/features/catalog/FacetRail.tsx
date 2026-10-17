import { useMemo } from 'react';
import type { Catalog } from '@shared/schemas/catalog.ts';
import { Icon } from '@/ui/Icon';
import { FacetGroup, FacetSubgroup } from './FacetGroup';
import { FacetList, type FacetListOption } from './FacetList';
import { FacetOption } from './FacetOption';
import { toggleHiddenWarning, toggleValue, type Facet, type Filters } from './filter-model';
import { centuryLabel, centuryShort } from './format';
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

  /** One facet's options for FacetList, in canonical order. */
  const options = (
    facet: Facet,
    items: { id: string; label?: string; group?: string | undefined; shortLabel?: string }[],
  ): FacetListOption[] =>
    items
      .filter((t) => visible(facet, t.id))
      .map((t) => ({
        id: t.id,
        label: t.label ?? labels.of(facet, t.id),
        group: t.group,
        ...(t.shortLabel ? { shortLabel: t.shortLabel } : {}),
        count: count(facet, t.id),
        checked: isOn(facet, t.id),
      }));
  const toggle = (facet: Facet) => (value: string) => onChange(toggleValue(filters, facet, value));

  const globalEras = catalog.eras
    .filter((e) => e.scope === 'global')
    .map((e) => ({ id: e.id, label: e.label }));
  // One list; the labels carry the region ("Victorian era (UK)").
  const namedEras = catalog.eras.filter((e) => e.scope === 'regional').map((e) => ({ id: e.id }));
  // Newest first: the recent centuries hold almost every story.
  const centuries = useMemo(
    () =>
      [...new Set([...counts.century.keys(), ...filters.century.map(String)])]
        .map(Number)
        .sort((a, b) => b - a)
        .map((c) => ({ id: String(c), label: centuryLabel(c), shortLabel: centuryShort(c) })),
    [counts.century, filters.century],
  );
  const countries = [...catalog.countries]
    .sort((a, b) => a.continent.localeCompare(b.continent) || a.name.localeCompare(b.name))
    .map((c) => ({ id: c.code, label: c.name, group: c.continent }));
  const continents = [...new Set(catalog.countries.map((c) => c.continent))]
    .sort()
    .map((c) => ({ id: c }));
  const warningOptions: FacetListOption[] = catalog.vocab.content_warnings
    .filter((w) => (warnings.get(w.id) ?? 0) > 0 || filters.cwHide.includes(w.id))
    .map((w) => ({
      id: w.id,
      label: w.label,
      count: warnings.get(w.id) ?? 0,
      checked: filters.cwHide.includes(w.id),
    }));

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
        <FacetSubgroup title="Broad periods" list={false}>
          <FacetList options={options('era', globalEras)} noun="periods" onToggle={toggle('era')} />
        </FacetSubgroup>
        <FacetSubgroup title="Named eras" list={false}>
          <FacetList
            options={options('era', namedEras)}
            noun="named eras"
            onToggle={toggle('era')}
          />
        </FacetSubgroup>
        <FacetSubgroup title="Centuries" list={false}>
          <FacetList
            options={options('century', centuries)}
            noun="centuries"
            onToggle={toggle('century')}
            limit={8}
            collapse="first"
            variant="chip"
          />
        </FacetSubgroup>
      </FacetGroup>

      <FacetGroup title="Theme" selected={filters.theme.length} defaultOpen>
        <FacetList
          options={options('theme', catalog.vocab.themes)}
          noun="themes"
          onToggle={toggle('theme')}
        />
      </FacetGroup>

      <FacetGroup title="Who they were" selected={filters.role.length}>
        <FacetList
          options={options('role', catalog.vocab.roles)}
          noun="roles"
          onToggle={toggle('role')}
        />
      </FacetGroup>

      <FacetGroup title="Region" selected={filters.continent.length + filters.country.length}>
        <FacetSubgroup title="Continents" list={false}>
          <FacetList
            options={options('continent', continents)}
            noun="continents"
            onToggle={toggle('continent')}
          />
        </FacetSubgroup>
        <FacetSubgroup title="Countries" list={false}>
          <FacetList
            options={options('country', countries)}
            noun="countries"
            onToggle={toggle('country')}
          />
        </FacetSubgroup>
      </FacetGroup>

      <FacetGroup title="Episode type" selected={filters.format.length}>
        <FacetList
          options={options('format', catalog.vocab.formats)}
          noun="episode types"
          onToggle={toggle('format')}
        />
      </FacetGroup>

      <FacetGroup title="Content warnings" selected={filters.cwHide.length}>
        <p className="facet-hint">Hide stories that spend real time on:</p>
        <FacetList
          options={warningOptions}
          noun="warnings"
          onToggle={(id) => onChange(toggleHiddenWarning(filters, id))}
        />
      </FacetGroup>
    </div>
  );
}

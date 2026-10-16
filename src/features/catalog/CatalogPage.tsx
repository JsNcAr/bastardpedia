import { useMemo } from 'react';
import { Link, useParams } from 'react-router';
import { useCatalog } from '@/app/queries';
import { WIDE_QUERY, useMediaQuery } from '@/app/useMediaQuery';
import { useUi } from '@/app/ui-store';
import { StoryDetail } from '@/features/story/StoryDetail';
import { Icon } from '@/ui/Icon';
import { StateMessage } from '@/ui/StateMessage';
import { ActiveFilters } from './ActiveFilters';
import { facetCounts, filterStories, warningCounts } from './match';
import { FacetRail } from './FacetRail';
import { FilterDrawer } from './FilterDrawer';
import { EMPTY_FILTERS, activeCount } from './filter-model';
import { createLabels } from './labels';
import { ResultRow } from './ResultRow';
import { createStorySearch } from './search';
import { SortControl } from './SortControl';
import { useFilters } from './useFilters';
import type { Catalog } from '@shared/schemas/catalog.ts';

export function CatalogPage() {
  const query = useCatalog();

  if (query.isPending) {
    return (
      <div className="page-state">
        <StateMessage icon="library" title="Loading the catalogue" busy role="status" />
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="page-state">
        <StateMessage
          icon="triangle-alert"
          title="The catalogue could not be loaded"
          role="alert"
          action={
            <button
              type="button"
              className="button button-primary"
              onClick={() => void query.refetch()}
            >
              Try again
            </button>
          }
        >
          <p>{query.error.message}</p>
        </StateMessage>
      </div>
    );
  }
  if (query.data.stories.length === 0) {
    return (
      <div className="page-state">
        <StateMessage icon="book-open-text" title="No stories have been tagged yet">
          <p>
            The episode list is in, but stories only appear here once they have been tagged with
            themes, places and periods. Run the tagger (docs/TAGGING.md), then rebuild the catalogue
            with <code>npm run build:catalog</code>.
          </p>
        </StateMessage>
      </div>
    );
  }
  return <Catalogue catalog={query.data} />;
}

function Catalogue({ catalog }: { catalog: Catalog }) {
  const { id } = useParams();
  const { filters, setFilters, search } = useFilters();
  const wide = useMediaQuery(WIDE_QUERY);
  const setFiltersOpen = useUi((s) => s.setFiltersOpen);

  const index = useMemo(() => createStorySearch(catalog.stories), [catalog.stories]);
  const labels = useMemo(() => createLabels(catalog), [catalog]);
  const matches = useMemo(() => index.run(filters.q), [index, filters.q]);
  const results = useMemo(
    () => filterStories(catalog.stories, filters, matches),
    [catalog.stories, filters, matches],
  );
  const counts = useMemo(
    () => facetCounts(catalog.stories, filters, matches),
    [catalog.stories, filters, matches],
  );
  const warnings = useMemo(
    () => warningCounts(catalog.stories, filters, matches),
    [catalog.stories, filters, matches],
  );

  const story = id ? catalog.stories.find((s) => s.id === id) : undefined;
  const backTo = { pathname: '/', search };

  const detail = id ? (
    story ? (
      <StoryDetail story={story} catalog={catalog} labels={labels} headingLevel={wide ? 2 : 1} />
    ) : (
      <StateMessage
        icon="info"
        title="Story not found"
        action={<Link to={backTo}>Back to the catalogue</Link>}
      >
        <p>
          There is no story with this address. It may have been renamed when the catalogue was
          rebuilt.
        </p>
      </StateMessage>
    )
  ) : null;

  // Narrow screens show a story as its own page.
  if (!wide && id) {
    return (
      <div className="story-page">
        <Link className="back-link" to={backTo}>
          <Icon name="arrow-left" size="sm" />
          Back to results
        </Link>
        {detail}
      </div>
    );
  }

  const rail = (
    <FacetRail
      catalog={catalog}
      filters={filters}
      counts={counts}
      warnings={warnings}
      labels={labels}
      onChange={setFilters}
    />
  );
  const active = activeCount(filters);

  return (
    <div className="catalog" data-has-story={id ? 'true' : undefined}>
      {wide ? (
        <aside className="catalog-rail" aria-label="Filters">
          {rail}
        </aside>
      ) : (
        <FilterDrawer resultCount={results.length}>{rail}</FilterDrawer>
      )}

      <section className="catalog-results" aria-labelledby="catalogue-title">
        <div className="results-head">
          <h1 id="catalogue-title" className="page-title">
            The catalogue
          </h1>
          <p className="results-count" aria-live="polite">
            {results.length === 1 ? '1 story' : `${String(results.length)} stories`}
            {results.length !== catalog.stories.length
              ? ` of ${String(catalog.stories.length)}`
              : ''}
          </p>
          <div className="results-tools">
            {!wide ? (
              <button type="button" className="button" onClick={() => setFiltersOpen(true)}>
                <Icon name="sliders-horizontal" size="sm" />
                Filters{active > 0 ? ` (${String(active)})` : ''}
              </button>
            ) : null}
            <SortControl filters={filters} onChange={setFilters} />
          </div>
          <ActiveFilters filters={filters} labels={labels} onChange={setFilters} />
        </div>

        {results.length === 0 ? (
          <StateMessage
            icon="search"
            title="No stories match these filters"
            action={
              <button
                type="button"
                className="button button-primary"
                onClick={() => setFilters({ ...EMPTY_FILTERS, sort: filters.sort })}
              >
                Clear all filters
              </button>
            }
          >
            <p>Remove a filter, or widen a period, to see more stories.</p>
          </StateMessage>
        ) : (
          <ol className="results" aria-label="Stories">
            {results.map((s) => (
              <ResultRow
                key={s.id}
                story={s}
                labels={labels}
                search={search}
                selected={s.id === id}
              />
            ))}
          </ol>
        )}
      </section>

      {detail ? (
        <section className="catalog-pane" aria-label="Story">
          {detail}
        </section>
      ) : null}
    </div>
  );
}

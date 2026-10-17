import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useCatalog, useLibrary } from '@/app/queries';
import { WIDE_QUERY, useMediaQuery } from '@/app/useMediaQuery';
import { useUi } from '@/app/ui-store';
import { StoryDetail } from '@/features/story/StoryDetail';
import { Icon } from '@/ui/Icon';
import { StateMessage } from '@/ui/StateMessage';
import { ActiveFilters } from './ActiveFilters';
import { facetCounts, filterStories, listenedCount, reviewedCount, warningCounts } from './match';
import { yearBounds } from './year-scale';
import { FacetRail } from './FacetRail';
import { FilterDrawer } from './FilterDrawer';
import { EMPTY_FILTERS, activeCount } from './filter-model';
import { createLabels } from './labels';
import { ResultRow } from './ResultRow';
import { SearchBox } from './SearchBox';
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
  const navigate = useNavigate();
  const paneRef = useRef<HTMLElement>(null);
  const shownId = useRef(id);
  const { filters, setFilters, search } = useFilters();
  const wide = useMediaQuery(WIDE_QUERY);
  const setFiltersOpen = useUi((s) => s.setFiltersOpen);

  // The visitor's marks (IndexedDB, loaded after the first paint): row markers and Hide listened.
  const library = useLibrary();
  const entries = useMemo(
    () => new Map((library.data ?? []).map((e) => [e.id, e])),
    [library.data],
  );
  const listened = useMemo(
    () => new Set([...entries.values()].filter((e) => e.status === 'listened').map((e) => e.id)),
    [entries],
  );

  const index = useMemo(() => createStorySearch(catalog.stories), [catalog.stories]);
  const labels = useMemo(() => createLabels(catalog), [catalog]);
  const matches = useMemo(() => index.run(filters.q), [index, filters.q]);
  const results = useMemo(
    () => filterStories(catalog.stories, filters, matches, listened),
    [catalog.stories, filters, matches, listened],
  );
  const counts = useMemo(
    () => facetCounts(catalog.stories, filters, matches, listened),
    [catalog.stories, filters, matches, listened],
  );
  const warnings = useMemo(
    () => warningCounts(catalog.stories, filters, matches, listened),
    [catalog.stories, filters, matches, listened],
  );

  const reviewed = useMemo(
    () => reviewedCount(catalog.stories, filters, matches, listened),
    [catalog.stories, filters, matches, listened],
  );
  const listenedMatches = useMemo(
    () => listenedCount(catalog.stories, filters, matches, listened),
    [catalog.stories, filters, matches, listened],
  );
  const bounds = useMemo(
    () => yearBounds(catalog.stories.map((s) => s.time?.covered_span)),
    [catalog.stories],
  );

  const story = id ? catalog.stories.find((s) => s.id === id) : undefined;
  const backTo = { pathname: '/', search };

  // Escape closes the story pane, unless the visitor is typing or a dialog is open.
  useEffect(() => {
    if (!wide || !id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return;
      const t = e.target;
      if (t instanceof HTMLElement && (t.isContentEditable || t.closest('input, textarea, select')))
        return;
      if (document.querySelector('dialog[open]')) return;
      void navigate({ pathname: '/', search });
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [wide, id, search, navigate]);

  useEffect(() => {
    const previous = shownId.current;
    shownId.current = id;
    // Each story starts at its top: the pane scrolls on its own and would keep its offset.
    if (id && paneRef.current) paneRef.current.scrollTop = 0;
    // Closing the pane removes the focused close button: return focus to the story's row.
    if (wide && previous && !id)
      document.querySelector<HTMLElement>(`[data-story="${previous}"]`)?.focus();
  }, [id, wide]);

  const detail = id ? (
    story ? (
      <StoryDetail
        story={story}
        catalog={catalog}
        labels={labels}
        headingLevel={wide ? 2 : 1}
        search={search}
      />
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
      reviewed={reviewed}
      yearBounds={bounds}
      labels={labels}
      showSearch={wide}
      listened={{ any: listened.size > 0, count: listenedMatches }}
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
          {!wide ? <SearchBox filters={filters} onChange={setFilters} /> : null}
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
            <button
              type="button"
              className="button"
              disabled={results.length === 0}
              onClick={() => {
                // A random story from the current results, never the one already open.
                const pool = results.length > 1 ? results.filter((s) => s.id !== id) : results;
                const pick = pool[Math.floor(Math.random() * pool.length)];
                if (pick) void navigate({ pathname: `/stories/${pick.id}`, search });
              }}
            >
              <Icon name="shuffle" size="sm" />
              Surprise me
            </button>
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
                entry={entries.get(s.id)}
              />
            ))}
          </ol>
        )}
      </section>

      {detail ? (
        <section className="catalog-pane" aria-label="Story" ref={paneRef}>
          <div className="pane-bar">
            <Link className="icon-button" to={backTo} aria-label="Close story" title="Close (Esc)">
              <Icon name="x" />
            </Link>
          </div>
          {detail}
        </section>
      ) : null}
    </div>
  );
}

import { useMemo, type ReactNode } from 'react';
import type { CatalogStory } from '@shared/schemas/catalog.ts';
import type { LibraryEntry } from '@/data';
import { formatYear } from '../format';
import { WIDTH, domainFor, ticks, toX } from './axis';
import { bins as binStories } from './density';
import { DensityStrip } from './DensityStrip';
import { TimelineRow } from './TimelineRow';

/**
 * The results as a timeline: a density strip to pick years, a shared year axis,
 * and one bar per story (main events solid, years covered faint). Stories without
 * dates follow under "No dates". The axis fits the stories shown; a year filter
 * zooms it.
 */
export function Timeline({
  stories,
  yearFrom,
  yearTo,
  search,
  openId,
  entries,
  terms,
  onYears,
  markFor,
  selectFor,
}: {
  stories: CatalogStory[];
  yearFrom: number | null;
  yearTo: number | null;
  search: string;
  openId: string | undefined;
  entries: ReadonlyMap<string, LibraryEntry>;
  terms: ReadonlyMap<string, string[]> | undefined;
  onYears: (from: number | null, to: number | null, live: boolean) => void;
  markFor?: (story: CatalogStory) => ReactNode;
  selectFor?: (story: CatalogStory) => string | undefined;
}) {
  const dated = useMemo(() => stories.filter((s) => s.time), [stories]);
  const undated = useMemo(() => stories.filter((s) => !s.time), [stories]);
  const domain = useMemo(() => domainFor(dated, { yearFrom, yearTo }), [dated, yearFrom, yearTo]);
  const binList = useMemo(() => binStories(dated, domain), [dated, domain]);
  const tickList = ticks(domain);

  const row = (s: CatalogStory) => (
    <TimelineRow
      key={s.id}
      story={s}
      domain={domain}
      search={search}
      selected={s.id === openId}
      entry={entries.get(s.id)}
      terms={terms?.get(s.id)}
      mark={markFor?.(s)}
      selectFor={selectFor?.(s)}
    />
  );

  return (
    <div className="timeline">
      <DensityStrip bins={binList} domain={domain} onRange={onYears} />
      <div className="timeline-axis" aria-hidden="true">
        <span className="timeline-axis-gap" />
        <svg className="timeline-axis-scale">
          {tickList.map((y, i) => {
            const pct = `${String((toX(y, domain) / WIDTH) * 100)}%`;
            return (
              <g key={y}>
                <line className="timeline-tick" x1={pct} x2={pct} y1="16" y2="24" />
                <text
                  className={
                    i % 2 ? 'timeline-tick-label timeline-tick-minor' : 'timeline-tick-label'
                  }
                  x={pct}
                  y="12"
                  textAnchor="middle"
                >
                  {formatYear(y)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <ol className="results timeline-list" aria-label="Stories">
        {dated.map(row)}
      </ol>
      {undated.length > 0 ? (
        <section className="timeline-undated" aria-labelledby="undated-title">
          <h2 id="undated-title" className="section-title">
            No dates
          </h2>
          <ol className="results timeline-list" aria-label="Stories without dates">
            {undated.map(row)}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

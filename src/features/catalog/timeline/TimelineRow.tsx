import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { CatalogStory } from '@shared/schemas/catalog.ts';
import type { LibraryEntry } from '@/data';
import { formatSpan } from '../format';
import { Highlight } from '../Highlight';
import { LibraryMarks } from '../ResultRow';
import { WIDTH, clip, offAxis, type Domain } from './axis';

const H = 12;

/** One story on the timeline: its title, its years, and a bar on the shared axis. */
export function TimelineRow({
  story,
  domain,
  search,
  selected,
  entry,
  terms,
  mark,
}: {
  story: CatalogStory;
  domain: Domain;
  search: string;
  selected: boolean;
  entry?: LibraryEntry | undefined;
  terms?: string[] | undefined;
  /** The control beside the row (RowMark): a sibling of the link, not inside it. */
  mark?: ReactNode;
}) {
  const time = story.time;
  const covered = time ? clip(time.covered_span, domain) : null;
  const main = time
    ? clip({ start: time.main_span.start, end: time.main_span.end ?? domain.end }, domain)
    : null;
  // An edge marker where the story runs off the axis, or lies wholly beyond it.
  const off = time ? offAxis(time.covered_span, domain) : null;
  const leftMark = covered?.clippedStart === true || off === 'before';
  const rightMark = covered?.clippedEnd === true || off === 'after';
  return (
    <li className="timeline-item">
      <Link
        to={{ pathname: `/stories/${story.id}`, search }}
        className="timeline-row"
        data-story={story.id}
        aria-current={selected ? 'page' : undefined}
        preventScrollReset
      >
        <span className="timeline-label">
          <span className="timeline-title">
            <Highlight text={story.title} terms={terms} />
          </span>
          <span className="timeline-years">
            {time ? formatSpan(time.covered_span, time.approximate) : 'Dates unknown'}
            {entry ? <LibraryMarks entry={entry} /> : null}
          </span>
        </span>
        <svg
          className="timeline-bar"
          viewBox={`0 0 ${String(WIDTH)} ${String(H)}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          {covered ? (
            <rect
              className="timeline-covered"
              x={covered.x}
              y={2}
              width={covered.width}
              height={H - 4}
            />
          ) : null}
          {main ? (
            <rect
              className="timeline-main"
              x={main.x}
              y={3}
              width={Math.max(main.width, 3)}
              height={H - 6}
            />
          ) : null}
          {leftMark ? (
            <path className="timeline-clip" d={`M0 ${String(H / 2)} L8 1 L8 ${String(H - 1)} Z`} />
          ) : null}
          {rightMark ? (
            <path
              className="timeline-clip"
              d={`M${String(WIDTH)} ${String(H / 2)} L${String(WIDTH - 8)} 1 L${String(WIDTH - 8)} ${String(H - 1)} Z`}
            />
          ) : null}
        </svg>
      </Link>
      {mark}
    </li>
  );
}

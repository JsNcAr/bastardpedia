import { Link } from 'react-router';
import type { CatalogStory } from '@shared/schemas/catalog.ts';
import type { LibraryEntry } from '@/data';
import { Icon } from '@/ui/Icon';
import { formatDuration, partsLabel, storyPeriod } from './format';
import { Highlight } from './Highlight';
import type { Labels } from './labels';

export function ResultRow({
  story,
  labels,
  search,
  selected,
  entry,
  terms,
}: {
  story: CatalogStory;
  labels: Labels;
  search: string;
  selected: boolean;
  /** The visitor's own marks for this story, if any. */
  entry?: LibraryEntry | undefined;
  /** Search terms this story matched, to mark in its title and summary. */
  terms?: string[] | undefined;
}) {
  const period = storyPeriod(story);
  return (
    <li>
      <Link
        to={{ pathname: `/stories/${story.id}`, search }}
        className="result"
        data-story={story.id}
        aria-current={selected ? 'page' : undefined}
        preventScrollReset
      >
        <span className="result-meta">
          {period ? <span>{period}</span> : null}
          <span>{labels.of('theme', story.themes.primary)}</span>
          {story.format !== 'deep-dive' ? (
            <span className="result-format">{labels.of('format', story.format)}</span>
          ) : null}
          {story.review.status === 'unreviewed' ? (
            <span className="badge-unreviewed">Unreviewed</span>
          ) : null}
          {entry ? <LibraryMarks entry={entry} /> : null}
        </span>
        <span className="result-title">
          <Highlight text={story.title} terms={terms} />
        </span>
        <span className="result-summary">
          <Highlight text={story.summary} terms={terms} />
        </span>
        <span className="result-foot">
          {partsLabel(story.parts.length)} · {formatDuration(story.total_duration_s)}
        </span>
      </Link>
    </li>
  );
}

/** Small icons for the visitor's marks, each with a text equivalent. */
export function LibraryMarks({ entry }: { entry: LibraryEntry }) {
  const marks = [
    entry.status === 'want' ? { icon: 'bookmark' as const, text: 'Want to listen' } : null,
    entry.status === 'listened' ? { icon: 'bookmark-check' as const, text: 'Listened' } : null,
    entry.favourite ? { icon: 'heart' as const, text: 'Favourite' } : null,
  ].filter((m) => m !== null);
  if (marks.length === 0) return null;
  return (
    <span className="result-marks">
      {marks.map((m) => (
        <span key={m.text} className="result-mark" title={m.text}>
          <Icon name={m.icon} size="sm" />
          <span className="visually-hidden">{m.text}</span>
        </span>
      ))}
    </span>
  );
}

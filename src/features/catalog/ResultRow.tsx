import { Link } from 'react-router';
import type { CatalogStory } from '@shared/schemas/catalog.ts';
import { formatDuration, partsLabel, storyPeriod } from './format';
import type { Labels } from './labels';

export function ResultRow({
  story,
  labels,
  search,
  selected,
}: {
  story: CatalogStory;
  labels: Labels;
  search: string;
  selected: boolean;
}) {
  const period = storyPeriod(story);
  return (
    <li>
      <Link
        to={{ pathname: `/stories/${story.id}`, search }}
        className="result"
        aria-current={selected ? 'page' : undefined}
        preventScrollReset
      >
        <span className="result-meta">
          {period ? <span>{period}</span> : null}
          <span>{labels.of('theme', story.themes.primary)}</span>
          {story.format !== 'deep-dive' ? (
            <span className="result-format">{labels.of('format', story.format)}</span>
          ) : null}
        </span>
        <span className="result-title">{story.title}</span>
        <span className="result-summary">{story.summary}</span>
        <span className="result-foot">
          {partsLabel(story.parts.length)} · {formatDuration(story.total_duration_s)}
        </span>
      </Link>
    </li>
  );
}

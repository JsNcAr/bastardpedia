import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { CatalogStory } from '@shared/schemas/catalog.ts';

/**
 * One release year in the catch-up list: a checkbox for the whole year (mixed
 * when only some are ticked), and the stories behind a disclosure. Each story row
 * is a label, so a tap anywhere on it toggles its box; Open is a sibling link.
 */
export function YearGroup({
  year,
  stories,
  ticked,
  listened,
  monthOf,
  onToggle,
}: {
  year: number;
  stories: CatalogStory[];
  ticked: ReadonlySet<string>;
  listened: ReadonlySet<string>;
  monthOf: (s: CatalogStory) => string;
  onToggle: (ids: string[], on: boolean) => void;
}) {
  const count = stories.filter((s) => ticked.has(s.id)).length;
  const all = count === stories.length;
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = count > 0 && !all;
  }, [count, all]);
  const noun = stories.length === 1 ? 'story' : 'stories';

  return (
    <section className="catch-year" aria-label={String(year)}>
      <label className="catch-year-head">
        <input
          ref={box}
          type="checkbox"
          checked={all}
          onChange={(e) =>
            onToggle(
              stories.map((s) => s.id),
              e.currentTarget.checked,
            )
          }
        />
        <span className="catch-year-title">All of {year}</span>
        <span className="catch-year-count">
          {count} of {stories.length}
        </span>
      </label>
      <details className="catch-year-list">
        <summary>
          <span className="catch-when-closed">
            Show the {stories.length} {noun}
          </span>
          <span className="catch-when-open">
            Hide the {stories.length} {noun}
          </span>
        </summary>
        <ul>
          {stories.map((s) => (
            <li key={s.id} className="catch-story">
              <label className="catch-story-pick">
                <input
                  type="checkbox"
                  checked={ticked.has(s.id)}
                  onChange={(e) => onToggle([s.id], e.currentTarget.checked)}
                />
                <span className="catch-story-title">{s.title}</span>
                <span className="catch-story-meta">
                  {monthOf(s)}
                  {listened.has(s.id) ? <span className="catch-badge">Listened</span> : null}
                </span>
              </label>
              <Link
                className="catch-story-link"
                to={`/stories/${s.id}`}
                aria-label={`Open ${s.title}`}
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

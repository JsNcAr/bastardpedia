import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import type { CatalogStory } from '@shared/schemas/catalog.ts';

/**
 * One release year in the catch-up list: a checkbox for the whole year (mixed
 * when only some are ticked), and the stories behind a disclosure, each with its
 * own checkbox. Stories already listened show as done and can't be changed.
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
  const open = stories.filter((s) => !listened.has(s.id));
  const count = open.filter((s) => ticked.has(s.id)).length;
  const all = count === open.length;
  const box = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (box.current) box.current.indeterminate = count > 0 && !all;
  }, [count, all]);

  return (
    <section className="catch-year" aria-label={String(year)}>
      <label className="catch-year-head">
        <input
          ref={box}
          type="checkbox"
          checked={open.length > 0 && all}
          disabled={open.length === 0}
          onChange={(e) =>
            onToggle(
              open.map((s) => s.id),
              e.currentTarget.checked,
            )
          }
        />
        <span className="catch-year-title">All of {year}</span>
        <span className="catch-year-count">
          {count + stories.length - open.length} of {stories.length}
        </span>
      </label>
      <details className="catch-year-list">
        <summary>
          Show the {stories.length} {stories.length === 1 ? 'story' : 'stories'}
        </summary>
        <ul>
          {stories.map((s) => {
            const done = listened.has(s.id);
            return (
              <li key={s.id} className="catch-story">
                <input
                  type="checkbox"
                  id={`catch-${s.id}`}
                  checked={done || ticked.has(s.id)}
                  disabled={done}
                  onChange={(e) => onToggle([s.id], e.currentTarget.checked)}
                />
                <label htmlFor={`catch-${s.id}`} className="catch-story-title">
                  {s.title}
                </label>
                <span className="catch-story-meta">
                  {monthOf(s)}
                  {done ? ' · already listened' : ''}
                </span>
                <Link
                  className="catch-story-link"
                  to={`/stories/${s.id}`}
                  aria-label={`Open ${s.title}`}
                >
                  Open
                </Link>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}

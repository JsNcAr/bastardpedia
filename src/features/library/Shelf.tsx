import { useState } from 'react';
import { Link } from 'react-router';
import type { LibraryEntry } from '@/data';
import { FIND_FROM, matchesQuery } from '@/features/catalog/facet-list';
import { Icon } from '@/ui/Icon';

/** Stories listed before "Show all": the first ones in the chosen sort (recent first by default). */
export const SHELF_LIMIT = 10;

export type ShelfKind = 'want' | 'favourite' | 'listened' | 'note';

/**
 * One library shelf: open, and collapsible by its heading. A long shelf lists its
 * first 10 stories then "Show all", with a find box past 20, and each story has a
 * quick action beside it (a sibling of its link, never inside it).
 */
export function Shelf({
  title,
  kind,
  entries,
  titles,
  busy,
  onAction,
}: {
  title: string;
  kind: ShelfKind;
  entries: LibraryEntry[];
  titles: Map<string, string>;
  busy: boolean;
  onAction: (kind: ShelfKind, entry: LibraryEntry, name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  if (entries.length === 0) return null;

  const nameOf = (e: LibraryEntry) => titles.get(e.id) ?? e.id;
  const found = query ? entries.filter((e) => matchesQuery(nameOf(e), query)) : entries;
  const shown = query || showAll ? found : found.slice(0, SHELF_LIMIT);

  return (
    <details className="shelf" open aria-label={title}>
      <summary className="shelf-summary">
        <h2 className="section-title shelf-title">{title}</h2>
        <span className="shelf-count">{entries.length}</span>
        <span className="facet-chevron">
          <Icon name="chevron-down" size="sm" />
        </span>
      </summary>
      {entries.length > FIND_FROM ? (
        <input
          type="search"
          className="facet-find shelf-find"
          placeholder={`Find in ${title}`}
          aria-label={`Find in ${title}`}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
      ) : null}
      {shown.length === 0 ? <p className="shelf-note">No stories match.</p> : null}
      <ul className="shelf-list">
        {shown.map((e) => {
          const name = titles.get(e.id);
          return (
            <li key={e.id} className="shelf-item">
              <div className="shelf-text">
                {name ? (
                  <Link to={`/stories/${e.id}`}>{name}</Link>
                ) : (
                  <span>
                    {e.id} <span className="shelf-missing">(no longer in the catalogue)</span>
                  </span>
                )}
                {e.note ? <p className="shelf-note">{e.note}</p> : null}
              </div>
              <ShelfAction
                kind={kind}
                name={nameOf(e)}
                disabled={busy}
                onClick={(button) => {
                  moveFocusOn(button);
                  onAction(kind, e, nameOf(e));
                }}
              />
            </li>
          );
        })}
      </ul>
      {!query && found.length > SHELF_LIMIT ? (
        <button type="button" className="facet-more" onClick={() => setShowAll(!showAll)}>
          {showAll ? 'Show fewer' : `Show all ${String(found.length)}`}
        </button>
      ) : null}
    </details>
  );
}

function ShelfAction({
  kind,
  name,
  disabled,
  onClick,
}: {
  kind: ShelfKind;
  name: string;
  disabled: boolean;
  onClick: (button: HTMLButtonElement) => void;
}) {
  if (kind === 'note') return null;
  if (kind === 'want') {
    return (
      <button
        type="button"
        className="button button-compact"
        aria-label={`Mark listened: ${name}`}
        disabled={disabled}
        onClick={(e) => onClick(e.currentTarget)}
      >
        <Icon name="bookmark-check" size="sm" />
        Listened
      </button>
    );
  }
  const listened = kind === 'listened';
  return (
    <button
      type="button"
      className="icon-button shelf-toggle"
      aria-pressed="true"
      aria-label={listened ? `Listened: ${name}` : `Favourite: ${name}`}
      title={listened ? 'Listened. Press to unmark' : 'Favourite. Press to remove'}
      disabled={disabled}
      onClick={(e) => onClick(e.currentTarget)}
    >
      <Icon name={listened ? 'bookmark-check' : 'heart'} size="sm" />
    </button>
  );
}

/** The item is about to leave its shelf: keep keyboard focus on a neighbour. */
function moveFocusOn(button: HTMLButtonElement) {
  const item = button.closest('li');
  const next = item?.nextElementSibling ?? item?.previousElementSibling;
  const target = next?.querySelector<HTMLElement>('a, button');
  if (target) target.focus();
  else button.closest('details')?.querySelector<HTMLElement>('summary')?.focus();
}
